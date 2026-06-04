import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exclude } from 'class-transformer';
import { Role } from '../enums/role.enum';

export type UserDocument = User & Document;

export interface UserAddress {
  _id: Types.ObjectId;
  label: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

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

  @Prop({
    type: [{
      label:     { type: String, default: 'Home' },
      name:      { type: String, required: true },
      phone:     { type: String, required: true },
      line1:     { type: String, required: true },
      city:      { type: String, required: true },
      state:     { type: String, required: true },
      pincode:   { type: String, required: true },
      isDefault: { type: Boolean, default: false },
    }],
    default: [],
  })
  addresses: UserAddress[];

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
