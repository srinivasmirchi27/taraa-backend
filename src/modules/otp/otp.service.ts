import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { UsersService } from '../users/users.service';
import { FIREBASE_ADMIN } from '../../firebase/firebase.provider';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App | null,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Custom OTP (backend-generated) ──────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ message: string }> {
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();

    await this.otpModel.deleteMany({ phone });
    await this.otpModel.create({ phone, code });

    // TODO: Replace console.log with your SMS provider (Twilio, MSG91, AWS SNS, etc.)
    this.logger.log(`OTP for ${phone}: ${code}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, code: string): Promise<{ accessToken: string; isNewUser: boolean }> {
    const otp = await this.otpModel.findOne({
      phone,
      code,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) throw new BadRequestException('Invalid or expired OTP');

    await otp.updateOne({ verified: true });

    let user = await this.usersService.findByPhone(phone);
    const isNewUser = !user;

    if (!user) {
      user = await this.usersService.create({ phone, name: phone, isActive: true, phoneVerified: true });
    } else {
      await this.usersService.update((user._id as any).toString(), { phoneVerified: true });
    }

    const uid = (user._id as any).toString();
    const accessToken = this.jwtService.sign({
      sub: uid,
      phone: user.phone,
      role: user.role,
    });

    return { accessToken, isNewUser };
  }

  // ─── Firebase Phone Auth (client-side OTP) ────────────────────────────────────
  // Flow: client does phone auth → Firebase sends SMS → user verifies on client
  //       → client gets ID token → sends here → backend verifies → returns app JWT

  async verifyFirebaseToken(idToken: string): Promise<{ accessToken: string; isNewUser: boolean }> {
    if (!this.firebaseApp) {
      throw new BadRequestException('Firebase Admin SDK is not configured on this server');
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await this.firebaseApp.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }

    const phone = decoded.phone_number;
    if (!phone) throw new BadRequestException('Token does not contain a phone number');

    let user = await this.usersService.findByPhone(phone);
    const isNewUser = !user;

    if (!user) {
      user = await this.usersService.create({ phone, name: phone, isActive: true, phoneVerified: true });
    } else if (!user.phoneVerified) {
      await this.usersService.update((user._id as any).toString(), { phoneVerified: true });
    }

    const uid = (user._id as any).toString();
    const accessToken = this.jwtService.sign({
      sub: uid,
      phone: user.phone,
      role: user.role,
    });

    return { accessToken, isNewUser };
  }
}
