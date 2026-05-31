import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument, TicketStatus, TicketPriority, TicketCategory } from './schemas/ticket.schema';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly model: Model<TicketDocument>,
  ) {}

  // ── Ticket number: TKT20260531001 ─────────────────────────────────────────
  private async generateTicketNumber(): Promise<string> {
    const now = new Date();
    const dateStr = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const prefix = `TKT${dateStr}`;
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const count = await this.model.countDocuments({
      createdAt: { $gte: startOfDay },
      ticketNumber: { $regex: `^${prefix}` },
    });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  // ── Submit a ticket ───────────────────────────────────────────────────────
  async create(dto: CreateTicketDto, userId?: string, userName?: string): Promise<TicketDocument> {
    if (!userId && (!dto.guestEmail || !dto.guestName)) {
      throw new BadRequestException('guestName and guestEmail are required for guest submissions');
    }

    const ticketNumber = await this.generateTicketNumber();
    return this.model.create({
      ticketNumber,
      userId:       userId ? new Types.ObjectId(userId) : undefined,
      guestName:    dto.guestName,
      guestEmail:   dto.guestEmail,
      subject:      dto.subject,
      message:      dto.message,
      category:     dto.category ?? TicketCategory.OTHER,
      orderNumber:  dto.orderNumber,
    });
  }

  // ── Admin: list all tickets ───────────────────────────────────────────────
  async findAll(params: {
    page?: number;
    limit?: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, priority, category, search } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status)   where.status   = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (search)   where.$or = [
      { subject:     { $regex: search, $options: 'i' } },
      { ticketNumber:{ $regex: search, $options: 'i' } },
      { orderNumber: { $regex: search, $options: 'i' } },
      { guestEmail:  { $regex: search, $options: 'i' } },
    ];

    const [items, total] = await Promise.all([
      this.model
        .find(where)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email phone')
        .exec(),
      this.model.countDocuments(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Customer: own tickets ─────────────────────────────────────────────────
  async findMyTickets(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { userId: new Types.ObjectId(userId) };
    const [items, total] = await Promise.all([
      this.model.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Get one ───────────────────────────────────────────────────────────────
  async findOne(id: string, requestingUser?: { id: string; role: Role }): Promise<TicketDocument> {
    const ticket = await this.model.findById(id).populate('userId', 'name email phone').exec();
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);

    if (requestingUser && requestingUser.role === Role.CUSTOMER) {
      if (ticket.userId?.toString() !== requestingUser.id) throw new ForbiddenException();
    }
    return ticket;
  }

  // ── Add a reply ───────────────────────────────────────────────────────────
  async addReply(
    id: string,
    message: string,
    requestingUser: { id: string; role: Role; name?: string },
  ): Promise<TicketDocument> {
    const ticket = await this.findOne(id, requestingUser);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    const sentBy: 'customer' | 'admin' =
      requestingUser.role === Role.CUSTOMER ? 'customer' : 'admin';

    const reply = {
      message,
      sentBy,
      userId:     new Types.ObjectId(requestingUser.id),
      senderName: requestingUser.name,
      createdAt:  new Date(),
    };

    // Auto-update status: admin reply → in_progress, customer reply on resolved → re-open
    const statusUpdate: Record<string, unknown> = { $push: { replies: reply } };
    if (sentBy === 'admin' && ticket.status === TicketStatus.OPEN) {
      statusUpdate['$set'] = { status: TicketStatus.IN_PROGRESS };
    } else if (sentBy === 'customer' && ticket.status === TicketStatus.RESOLVED) {
      statusUpdate['$set'] = { status: TicketStatus.OPEN };
    }

    return this.model
      .findByIdAndUpdate(id, statusUpdate, { new: true })
      .populate('userId', 'name email phone')
      .exec();
  }

  // ── Admin: update status / priority ──────────────────────────────────────
  async update(
    id: string,
    data: { status?: TicketStatus; priority?: TicketPriority },
  ): Promise<TicketDocument> {
    const updates: Record<string, unknown> = { ...data };
    if (data.status === TicketStatus.RESOLVED) updates.resolvedAt = new Date();
    if (data.status === TicketStatus.OPEN)     updates.resolvedAt = null;

    const ticket = await this.model
      .findByIdAndUpdate(id, updates, { new: true })
      .populate('userId', 'name email phone')
      .exec();
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  // ── Admin: summary stats ──────────────────────────────────────────────────
  async getStats() {
    const [byStatus, byCategory, byPriority] = await Promise.all([
      this.model.aggregate([{ $group: { _id: '$status',   count: { $sum: 1 } } }]),
      this.model.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      this.model.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    ]);

    const toMap = (arr: { _id: string; count: number }[]) =>
      arr.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});

    return {
      byStatus:   toMap(byStatus),
      byCategory: toMap(byCategory),
      byPriority: toMap(byPriority),
      total:      Object.values(toMap(byStatus) as Record<string, number>).reduce((a, b) => a + b, 0),
    };
  }
}
