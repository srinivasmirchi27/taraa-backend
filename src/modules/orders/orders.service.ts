import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async create(dto: CreateOrderDto, userId?: string): Promise<Order> {
    const total = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = this.repo.create({
      orderNumber,
      userId,
      items: dto.items,
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      total,
    });
    return this.repo.save(order);
  }

  async findAll(params: { page?: number; limit?: number; status?: OrderStatus; userId?: string }) {
    const { page = 1, limit = 20, status, userId } = params;
    const where: Partial<Order> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [items, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async findMyOrders(userId: string, page = 1, limit = 10) {
    return this.findAll({ page, limit, userId });
  }

  async updateStatus(id: string, status: OrderStatus, requestingUser: { id: string; role: Role }): Promise<Order> {
    const order = await this.findOne(id);
    // Customers can only cancel their own orders
    if (requestingUser.role === Role.CUSTOMER) {
      if (order.userId !== requestingUser.id) throw new ForbiddenException();
      if (status !== OrderStatus.CANCELLED) throw new ForbiddenException('Customers can only cancel orders');
    }
    order.status = status;
    return this.repo.save(order);
  }
}
