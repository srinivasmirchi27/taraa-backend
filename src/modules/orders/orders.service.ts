import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly model: Model<OrderDocument>,
  ) {}

  // ── Order number: TRA20250531001 ───────────────────────────────────────────
  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;
    const prefix = `TRA${dateStr}`;

    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const count = await this.model.countDocuments({
      createdAt: { $gte: startOfDay },
      orderNumber: { $regex: `^${prefix}` },
    });

    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(dto: CreateOrderDto, userId?: string): Promise<OrderDocument> {
    const subtotal = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = dto.items.reduce((sum, item) => sum + item.quantity, 0);
    // Flat ₹50 shipping. Free when subtotal ≥ ₹500 OR 5+ items.
    const shipping = subtotal >= 500 || itemCount >= 5 ? 0 : 50;
    const total = subtotal + shipping;
    const orderNumber = await this.generateOrderNumber();

    return this.model.create({
      orderNumber,
      userId: userId || undefined,
      items: dto.items,
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      guestEmail: dto.guestEmail,
      shipping,
      total,
      // Orders start PENDING (awaiting payment). They only become a real,
      // placed order (PROCESSING) once the payment is verified as paid.
      status: OrderStatus.PENDING,
    });
  }

  // Remove an order that never got paid (payment failed / popup dismissed).
  // Guarded so it can never delete a paid/confirmed order.
  async cancelPending(id: string): Promise<void> {
    await this.model
      .deleteOne({ _id: id, status: OrderStatus.PENDING, isPaid: false })
      .exec();
  }

  async cancelPendingByRazorpayOrderId(razorpayOrderId: string): Promise<void> {
    await this.model
      .deleteOne({ razorpayOrderId, status: OrderStatus.PENDING, isPaid: false })
      .exec();
  }

  // ── Admin: list all ────────────────────────────────────────────────────────
  async findAll(params: { page?: number; limit?: number; status?: OrderStatus; userId?: string }) {
    const { page = 1, limit = 20, status, userId } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    // Exclude unpaid PENDING orders (failed/abandoned payments) by default so
    // they never show up as placed orders in My Orders or the admin panel.
    if (status) where.status = status;
    else where.status = { $ne: OrderStatus.PENDING };
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      this.model
        .find(where)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email phone')
        .exec(),
      this.model.countDocuments(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Get one ────────────────────────────────────────────────────────────────
  async findOne(id: string): Promise<OrderDocument> {
    const order = await this.model.findById(id).populate('userId', 'name email phone').exec();
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  // ── My orders (authenticated) ──────────────────────────────────────────────
  async findMyOrders(userId: string, page = 1, limit = 10) {
    return this.findAll({ page, limit, userId });
  }

  // ── Public order tracking by orderNumber + email ───────────────────────────
  async track(orderNumber: string, email: string): Promise<object> {
    const order = await this.model
      .findOne({ orderNumber })
      .populate('userId', 'email')
      .exec();

    if (!order) throw new NotFoundException('Order not found');

    // Verify ownership via email
    const ownerEmail: string =
      (order.userId as any)?.email ?? order.guestEmail ?? '';

    if (!ownerEmail || ownerEmail.toLowerCase() !== email.toLowerCase()) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderNumber:     order.orderNumber,
      status:          order.status,
      items:           order.items.map(i => ({
        name:     i.name,
        image:    i.image,
        quantity: i.quantity,
        price:    i.price,
      })),
      total:           order.total,
      placedOn:        (order as any).createdAt,
      expectedBy:      order.expectedBy ?? null,
      carrier:         order.carrier ?? null,
      awbNumber:       order.awbNumber ?? null,
      shippingAddress: {
        name:    order.shippingAddress.name,
        city:    order.shippingAddress.city,
        pincode: order.shippingAddress.pincode,
      },
      timeline: this.buildTimeline(order),
    };
  }

  // ── Timeline builder ────────────────────────────────────────────────────────
  private buildTimeline(order: OrderDocument) {
    const s = order.status;
    const shipped   = s === OrderStatus.SHIPPED   || s === OrderStatus.DELIVERED;
    const delivered = s === OrderStatus.DELIVERED;
    const cancelled = s === OrderStatus.CANCELLED;

    return [
      {
        label:    'Order Placed',
        location: 'taraajewellery.in',
        time:     (order as any).createdAt,
        done:     true,
        active:   s === OrderStatus.PROCESSING,
      },
      {
        label:    'Order Confirmed',
        location: 'Taraa Warehouse, Hyderabad',
        time:     order.confirmedAt ?? null,
        done:     !cancelled && (!!order.confirmedAt || shipped || delivered),
        active:   !cancelled && !order.confirmedAt && s === OrderStatus.PROCESSING,
      },
      {
        label:    'Packed & Dispatched',
        location: 'Taraa Warehouse, Hyderabad',
        time:     order.shippedAt ?? null,
        done:     shipped || delivered,
        active:   shipped && !delivered,
      },
      {
        label:    'In Transit',
        location: order.carrier ? `${order.carrier} Hub` : '',
        time:     order.shippedAt ?? null,
        done:     shipped || delivered,
        active:   shipped && !delivered,
      },
      {
        label:    'Out for Delivery',
        location: '',
        time:     null,
        done:     delivered,
        active:   false,
      },
      {
        label:    'Delivered',
        location: '',
        time:     order.deliveredAt ?? null,
        done:     delivered,
        active:   delivered,
      },
    ];
  }

  // ── Razorpay helpers ───────────────────────────────────────────────────────
  async attachRazorpayOrderId(id: string, razorpayOrderId: string): Promise<OrderDocument> {
    const order = await this.model.findByIdAndUpdate(id, { razorpayOrderId }, { new: true }).exec();
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async markAsPaid(id: string, razorpayPaymentId: string, razorpaySignature: string): Promise<OrderDocument> {
    const order = await this.model
      .findByIdAndUpdate(
        id,
        { isPaid: true, status: OrderStatus.PROCESSING, razorpayPaymentId, razorpaySignature, paidAt: new Date() },
        { new: true },
      )
      .exec();
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  // ── Status update (admin/customer) — auto-sets timestamps ─────────────────
  async updateStatus(id: string, status: OrderStatus, requestingUser: { id: string; role: Role }): Promise<OrderDocument> {
    const order = await this.findOne(id);

    if (requestingUser.role === Role.CUSTOMER) {
      if (order.userId?.toString() !== requestingUser.id) throw new ForbiddenException();
      if (status !== OrderStatus.CANCELLED) throw new ForbiddenException('Customers can only cancel orders');
    }

    const updates: Partial<Order> = { status };
    const now = new Date();

    if (status === OrderStatus.SHIPPED && !order.shippedAt) {
      (updates as any).shippedAt = now;
      (updates as any).confirmedAt = order.confirmedAt ?? now;
    }
    if (status === OrderStatus.DELIVERED && !order.deliveredAt) {
      (updates as any).deliveredAt = now;
      (updates as any).shippedAt = order.shippedAt ?? now;
      (updates as any).confirmedAt = order.confirmedAt ?? now;
    }

    return this.model.findByIdAndUpdate(id, updates, { new: true }).exec();
  }
}
