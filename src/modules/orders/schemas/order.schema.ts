import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        image: { type: String },
      },
    ],
    required: true,
  })
  items: OrderItem[];

  @Prop({ required: true, type: Number })
  total: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PROCESSING })
  status: OrderStatus;

  @Prop({
    type: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    required: true,
  })
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };

  @Prop({ default: 'COD' })
  paymentMethod: string;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  razorpayOrderId: string;

  @Prop()
  razorpayPaymentId: string;

  @Prop()
  razorpaySignature: string;

  @Prop({ type: Date })
  paidAt: Date;

  // Guest tracking — email stored so guests can look up without auth
  @Prop()
  guestEmail: string;

  // Shipping / tracking fields (set by admin when dispatching)
  @Prop()
  carrier: string;

  @Prop()
  awbNumber: string;

  @Prop({ type: Date })
  expectedBy: Date;

  // Status transition timestamps (set automatically on status change)
  @Prop({ type: Date })
  confirmedAt: Date;

  @Prop({ type: Date })
  shippedAt: Date;

  @Prop({ type: Date })
  deliveredAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
