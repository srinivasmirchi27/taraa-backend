import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = `"${config.get('MAIL_FROM_NAME', 'Taraa')}" <${config.get('MAIL_FROM_ADDRESS', 'noreply@taraa.in')}>`;

    this.transporter = nodemailer.createTransport({
      host: config.get<string>('MAIL_HOST'),
      port: config.get<number>('MAIL_PORT', 587),
      secure: config.get<number>('MAIL_PORT', 587) === 465,
      auth: {
        user: config.get<string>('MAIL_USER'),
        pass: config.get<string>('MAIL_PASS'),
      },
    });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.config.get('MAIL_HOST')) {
      this.logger.warn(`Mail not configured — would have sent "${subject}" to ${to}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent: "${subject}" → ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.send(
      to,
      'Welcome to Taraa! 🎉',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#c0392b">Welcome to Taraa, ${name}!</h2>
        <p>Thank you for creating an account. Explore our exclusive jewellery collection.</p>
        <a href="https://taraa.in/shop"
           style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          Shop Now
        </a>
        <p style="color:#888;font-size:12px;margin-top:32px">
          If you did not create this account, please ignore this email.
        </p>
      </div>
      `,
    );
  }

  async sendOtp(to: string, otp: string, name?: string): Promise<void> {
    await this.send(
      to,
      `Your Taraa OTP: ${otp}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#c0392b">Taraa Verification Code</h2>
        ${name ? `<p>Hi ${name},</p>` : ''}
        <p>Use the code below to verify your account. It expires in <strong>5 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;
                    background:#f8f8f8;padding:24px;border-radius:8px;margin:24px 0">
          ${otp}
        </div>
        <p style="color:#888;font-size:12px">
          If you did not request this, please ignore this email.
        </p>
      </div>
      `,
    );
  }

  async sendPasswordReset(to: string, name: string, resetLink: string): Promise<void> {
    await this.send(
      to,
      'Reset your Taraa password',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#c0392b">Password Reset</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below. The link expires in <strong>1 hour</strong>.</p>
        <a href="${resetLink}"
           style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px;margin-top:32px">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
      `,
    );
  }

  async sendOrderConfirmation(to: string, name: string, order: {
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    shippingAddress: { line1: string; city: string; state: string; pincode: string };
  }): Promise<void> {
    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${(i.price * i.quantity).toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    await this.send(
      to,
      `Order Confirmed — ${order.orderNumber}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#c0392b">Order Confirmed!</h2>
        <p>Hi ${name}, your order <strong>${order.orderNumber}</strong> has been placed successfully.</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f8f8f8">
              <th style="padding:8px;text-align:left">Item</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:8px;text-align:right;font-weight:bold">Total</td>
              <td style="padding:8px;text-align:right;font-weight:bold">₹${order.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <p><strong>Delivering to:</strong><br>
           ${order.shippingAddress.line1}, ${order.shippingAddress.city},
           ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
        </p>

        <a href="https://taraa.in/orders"
           style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          Track Order
        </a>
      </div>
      `,
    );
  }

  async sendOrderStatusUpdate(to: string, name: string, orderNumber: string, status: string): Promise<void> {
    const statusLabel: Record<string, string> = {
      processing: '⏳ Being processed',
      shipped: '🚚 Shipped',
      delivered: '✅ Delivered',
      cancelled: '❌ Cancelled',
    };

    await this.send(
      to,
      `Order ${orderNumber} — ${statusLabel[status] ?? status}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#c0392b">Order Update</h2>
        <p>Hi ${name}, your order <strong>${orderNumber}</strong> status has been updated to:</p>
        <p style="font-size:20px;font-weight:bold">${statusLabel[status] ?? status}</p>
        <a href="https://taraa.in/orders"
           style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          View Order
        </a>
      </div>
      `,
    );
  }
}
