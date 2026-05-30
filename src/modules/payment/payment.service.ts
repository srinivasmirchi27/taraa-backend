import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay = require('razorpay');
import { OrdersService } from '../orders/orders.service';
import { RAZORPAY } from './razorpay.provider';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(RAZORPAY) private readonly razorpay: Razorpay,
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService,
  ) {}

  // ─── Step 1: Initiate checkout ────────────────────────────────────────────────
  // Creates both an app order (status: processing) and a Razorpay order.
  // Returns everything the client needs to open the Razorpay checkout popup.

  async initiateCheckout(dto: InitiatePaymentDto, userId?: string) {
    const total = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const currency = dto.currency ?? 'INR';

    // Create the app-side order first
    const appOrder = await this.ordersService.create(
      { items: dto.items, shippingAddress: dto.shippingAddress, paymentMethod: 'RAZORPAY' },
      userId,
    );

    // amount in paise (Razorpay works in smallest currency unit)
    const amountPaise = Math.round(total * 100);

    const rzpOrder = await (this.razorpay.orders.create as any)({
      amount: amountPaise,
      currency,
      receipt: appOrder._id.toString(),
      notes: {
        appOrderId: appOrder._id.toString(),
        userId: userId ?? 'guest',
      },
    });

    // Persist the Razorpay order ID on our order
    await this.ordersService.attachRazorpayOrderId(appOrder._id.toString(), rzpOrder.id);

    return {
      appOrderId: appOrder._id.toString(),
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency,
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
      prefill: {
        name: dto.shippingAddress.name,
        contact: dto.shippingAddress.phone,
      },
    };
  }

  // ─── Step 2: Verify payment after client checkout ─────────────────────────────
  // Validates the HMAC-SHA256 signature Razorpay sends back after payment.
  // On success, marks the order as paid.

  async verifyPayment(dto: {
    appOrderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new UnauthorizedException('Payment signature verification failed');
    }

    const order = await this.ordersService.markAsPaid(
      dto.appOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    return { success: true, order };
  }

  // ─── Step 3 (optional): Razorpay webhook ─────────────────────────────────────
  // Handles server-side payment events. Razorpay sends the webhook even if the
  // client tab is closed, so this is the reliable confirmation path.
  // Requires the raw request body (not JSON-parsed) for signature check.

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping webhook signature check');
    } else {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSig !== signature) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const event = JSON.parse(rawBody.toString());
    const eventType: string = event.event;

    if (eventType === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const appOrderId: string = payment.notes?.appOrderId;

      if (appOrderId) {
        await this.ordersService.markAsPaid(appOrderId, payment.id, '');
        this.logger.log(`Webhook: order ${appOrderId} marked as paid`);
      }
    }

    if (eventType === 'payment.failed') {
      const payment = event.payload.payment.entity;
      this.logger.warn(`Webhook: payment failed — ${payment.id}`);
    }

    return { received: true };
  }

  // ─── Refund ───────────────────────────────────────────────────────────────────

  async refundPayment(paymentId: string, amount?: number) {
    const payload: Record<string, unknown> = {};
    if (amount) payload.amount = Math.round(amount * 100); // partial refund in paise

    const refund = await (this.razorpay.payments.refund as any)(paymentId, payload);
    return refund;
  }
}
