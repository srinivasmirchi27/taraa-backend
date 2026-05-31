import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

export enum OtpPurpose {
  PHONE_AUTH         = 'phone_auth',
  PHONE_REGISTRATION = 'phone_registration',
  PASSWORD_RESET     = 'password_reset',
  PHONE_VERIFICATION = 'phone_verification',
  EMAIL_VERIFICATION = 'email_verification',
}

@Schema({ timestamps: true })
export class Otp {
  // Phone-based OTP (phone auth)
  @Prop()
  phone: string;

  // Email-based OTP (forgot password)
  @Prop()
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ type: String, enum: OtpPurpose, default: OtpPurpose.PHONE_AUTH })
  purpose: OtpPurpose;

  @Prop({ default: false })
  verified: boolean;

  // Stores pending registration data — only set when purpose = phone_registration
  @Prop({ type: Object })
  registrationData?: {
    name: string;
    email: string;
    hashedPassword: string;
  };

  // MongoDB TTL index — auto-deletes after expiry
  @Prop({ type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) })
  expiresAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ phone: 1, purpose: 1 });
OtpSchema.index({ email: 1, purpose: 1 });
