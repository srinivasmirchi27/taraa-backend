import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
  OPEN        = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED    = 'resolved',
  CLOSED      = 'closed',
}

export enum TicketPriority {
  LOW    = 'low',
  MEDIUM = 'medium',
  HIGH   = 'high',
}

export enum TicketCategory {
  ORDER    = 'order',
  PAYMENT  = 'payment',
  PRODUCT  = 'product',
  SHIPPING = 'shipping',
  RETURN   = 'return',
  OTHER    = 'other',
}

export interface TicketReply {
  _id?: Types.ObjectId;
  message: string;
  sentBy: 'customer' | 'admin';
  userId?: Types.ObjectId;
  senderName?: string;
  createdAt: Date;
}

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class Ticket {
  @Prop({ required: true, unique: true })
  ticketNumber: string;

  // Logged-in user (optional — guests can submit without auth)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  // Guest fields — used when userId is absent
  @Prop()
  guestName: string;

  @Prop()
  guestEmail: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: String, enum: TicketCategory, default: TicketCategory.OTHER })
  category: TicketCategory;

  @Prop({ type: String, enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Prop({ type: String, enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  // Optional link to an order
  @Prop()
  orderNumber: string;

  // Thread of replies
  @Prop({
    type: [
      {
        message:    { type: String, required: true },
        sentBy:     { type: String, enum: ['customer', 'admin'], required: true },
        userId:     { type: Types.ObjectId, ref: 'User' },
        senderName: { type: String },
        createdAt:  { type: Date, default: () => new Date() },
      },
    ],
    default: [],
  })
  replies: TicketReply[];

  @Prop({ type: Date })
  resolvedAt: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.index({ userId: 1, createdAt: -1 });
TicketSchema.index({ status: 1, priority: -1 });
