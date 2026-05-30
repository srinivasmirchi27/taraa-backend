import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async create(dto: CreateOrderDto, userId?: string): Promise<OrderDocument> {
    const total = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return this.model.create({
      orderNumber,
      userId: userId || undefined,
      items: dto.items,
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      total,
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userId?: string;
  }) {
    const { page = 1, limit = 20, status, userId } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      this.model.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email phone').exec(),
      this.model.countDocuments(where),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<OrderDocument> {
    const order = await this.model.findById(id).populate('userId', 'name email phone').exec();
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async findMyOrders(userId: string, page = 1, limit = 10) {
    return this.findAll({ page, limit, userId });
  }

  async attachRazorpayOrderId(id: string, razorpayOrderId: string): Promise<OrderDocument> {
    const order = await this.model.findByIdAndUpdate(id, { razorpayOrderId }, { new: true }).exec();
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async markAsPaid(
    id: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<OrderDocument> {
    const order = await this.model
      .findByIdAndUpdate(
        id,
        { isPaid: true, razorpayPaymentId, razorpaySignature, paidAt: new Date() },
        { new: true },
      )
      .exec();
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    requestingUser: { id: string; role: Role },
  ): Promise<OrderDocument> {
    const order = await this.findOne(id);

    if (requestingUser.role === Role.CUSTOMER) {
      if (order.userId?.toString() !== requestingUser.id) throw new ForbiddenException();
      if (status !== OrderStatus.CANCELLED) throw new ForbiddenException('Customers can only cancel orders');
    }

    order.status = status;
    return order.save();
  }
}
