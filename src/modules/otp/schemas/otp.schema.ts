import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: false })
  verified: boolean;

  // MongoDB TTL index auto-deletes the document after expiry
  @Prop({ type: Date, default: () => new Date(Date.now() + 5 * 60 * 1000) })
  expiresAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ phone: 1 });
