import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, toJSON: { virtuals: true }, suppressReservedKeysWarning: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ required: true, type: Number })
  originalPrice: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  image: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  badge: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ default: true })
  inStock: boolean;

  @Prop({ type: Number, default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviews: number;

  @Prop({ default: false })
  isNew: boolean;

  @Prop({ default: false })
  isBestSeller: boolean;

  @Prop()
  cloudinaryPublicId: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 'text', description: 'text' });
