import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Exclude } from 'class-transformer';
import { Role } from '../enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class User {
  @Prop({ trim: true })
  name: string;

  @Prop({ unique: true, sparse: true, lowercase: true, trim: true })
  email: string;

  @Exclude()
  @Prop({ select: false })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.CUSTOMER })
  role: Role;

  @Prop({ unique: true, sparse: true })
  phone: string;

  @Prop()
  address: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop()
  profileImage: string;

  // Social login
  @Prop({ unique: true, sparse: true })
  googleId: string;

  @Prop({ default: false })
  emailVerified: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
