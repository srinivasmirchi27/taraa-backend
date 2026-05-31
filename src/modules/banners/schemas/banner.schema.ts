import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

export enum BannerType {
  HERO        = 'hero',        // full-width homepage hero slider
  PROMOTIONAL = 'promotional', // sale / offer strip or card
  SIDEBAR     = 'sidebar',     // sidebar ad / category banner
}

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class Banner {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  subtitle: string;

  @Prop({ required: true })
  image: string;

  @Prop()
  cloudinaryPublicId: string;

  // Where clicking the banner navigates (relative or absolute URL)
  @Prop()
  link: string;

  @Prop({ type: String, enum: BannerType, default: BannerType.HERO })
  type: BannerType;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  // Optional scheduling — null means always active
  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  // Short label shown on the banner e.g. "Sale", "New Collection"
  @Prop()
  badge: string;

  // CTA button text e.g. "Shop Now"
  @Prop()
  ctaText: string;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

BannerSchema.index({ type: 1, isActive: 1, sortOrder: 1 });
