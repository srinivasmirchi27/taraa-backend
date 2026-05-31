import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../modules/users/users.service';
import { UserDocument } from '../modules/users/schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { Otp, OtpDocument, OtpPurpose } from '../modules/otp/schemas/otp.schema';
import { MailService } from '../modules/mail/mail.service';
import { SmsService } from '../modules/otp/sms.service';
import { GoogleProfile } from './strategies/google.strategy';

const REFRESH_TOKEN_DAYS = 30;

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Otp.name)
    private readonly otpModel: Model<OtpDocument>,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {
    this.googleClient = new OAuth2Client(config.get<string>('GOOGLE_CLIENT_ID'));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private buildAccessToken(user: UserDocument): string {
    const uid = (user._id as any).toString();
    return this.jwtService.sign(
      { sub: uid, email: user.email, role: user.role },
      { expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') },
    );
  }

  private async buildRefreshToken(
    userId: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    await this.refreshTokenModel.create({
      tokenHash: this.hashToken(raw),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    });
    return raw;
  }

  private async issueTokenPair(user: UserDocument, meta?: { userAgent?: string; ip?: string }) {
    const uid = (user._id as any).toString();
    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.buildAccessToken(user)),
      this.buildRefreshToken(uid, meta),
    ]);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      user: { id: uid, email: user.email, name: user.name, role: user.role, profileImage: user.profileImage },
    };
  }

  // ─── Email / Password ─────────────────────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user?.password) return null; // Google-only account has no password
    if (await bcrypt.compare(password, user.password)) return user;
    return null;
  }

  async login(user: UserDocument, meta?: { userAgent?: string; ip?: string }) {
    return this.issueTokenPair(user, meta);
  }

  async register(name: string, email: string, password: string, phone?: string, meta?: { userAgent?: string; ip?: string }) {
    const hashed = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ name, email, password: hashed, phone, phoneVerified: false });
    this.mailService.sendWelcome(email, name).catch(() => null);
    return this.issueTokenPair(user, meta);
  }

  // ─── Google OAuth (web redirect flow) ────────────────────────────────────────
  // Called after Passport validates the OAuth code and returns a GoogleProfile.

  async googleLogin(profile: GoogleProfile, meta?: { userAgent?: string; ip?: string }) {
    let user = await this.usersService.findForGoogleLogin(profile.googleId, profile.email);
    const isNew = !user;

    if (!user) {
      // Brand new user — create account
      user = await this.usersService.create({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        profileImage: profile.profileImage,
        emailVerified: profile.emailVerified,
        isActive: true,
      });
      this.mailService.sendWelcome(profile.email, profile.name).catch(() => null);
    } else if (!user.googleId) {
      // Existing email account — link Google ID to it
      user = await this.usersService.update((user._id as any).toString(), {
        googleId: profile.googleId,
        profileImage: user.profileImage || profile.profileImage,
        emailVerified: profile.emailVerified,
      });
    }

    const result = await this.issueTokenPair(user, meta);
    return { ...result, isNew };
  }

  // ─── Google ID Token (mobile / SPA flow) ─────────────────────────────────────
  // Frontend uses Google Sign-In SDK → gets idToken → sends here.

  async googleTokenLogin(idToken: string, meta?: { userAgent?: string; ip?: string }) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new BadRequestException('Google login is not configured on this server');

    let payload: any;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const profile: GoogleProfile = {
      googleId: payload.sub,
      email: payload.email ?? '',
      name: payload.name ?? payload.email,
      profileImage: payload.picture,
      emailVerified: payload.email_verified ?? false,
    };

    return this.googleLogin(profile, meta);
  }

  // ─── Refresh token flow ───────────────────────────────────────────────────────

  async refreshAccessToken(rawToken: string): Promise<{ accessToken: string; expiresIn: string }> {
    const tokenDoc = await this.refreshTokenModel.findOne({
      tokenHash: this.hashToken(rawToken),
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
    if (!tokenDoc) throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.usersService.findOne(tokenDoc.userId.toString());
    return {
      accessToken: this.buildAccessToken(user),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<{ message: string }> {
    await this.refreshTokenModel.updateOne(
      { tokenHash: this.hashToken(rawToken) },
      { revoked: true },
    );
    return { message: 'Logged out successfully' };
  }

  async revokeAllTokens(userId: string): Promise<{ message: string }> {
    await this.refreshTokenModel.updateMany({ userId, revoked: false }, { revoked: true });
    return { message: 'Logged out from all devices' };
  }

  verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // ─── Phone verification — send OTP ───────────────────────────────────────
  async sendPhoneVerificationOtp(userId: string, phone: string): Promise<{ message: string }> {
    const existing = await this.usersService.findByPhone(phone);
    if (existing && (existing._id as any).toString() !== userId) {
      throw new BadRequestException('This phone number is already registered to another account');
    }

    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    await this.otpModel.deleteMany({ phone, purpose: OtpPurpose.PHONE_VERIFICATION });
    await this.otpModel.create({ phone, code, purpose: OtpPurpose.PHONE_VERIFICATION });

    await this.smsService.send(phone, code);

    return { message: `OTP sent to ${phone}. It expires in 10 minutes.` };
  }

  // ─── Phone verification — verify OTP ─────────────────────────────────────
  async verifyPhone(userId: string, phone: string, code: string): Promise<{ message: string }> {
    const record = await this.otpModel.findOne({
      phone,
      code,
      purpose: OtpPurpose.PHONE_VERIFICATION,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) throw new BadRequestException('Invalid or expired OTP');

    await record.updateOne({ verified: true });
    await this.usersService.update(userId, { phone, phoneVerified: true });

    return { message: 'Phone number verified successfully' };
  }

  // ─── Email verification — send OTP ───────────────────────────────────────
  async sendEmailVerificationOtp(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user.email) throw new BadRequestException('No email address on this account');
    if (user.emailVerified) throw new BadRequestException('Email is already verified');

    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    await this.otpModel.deleteMany({ email: user.email, purpose: OtpPurpose.EMAIL_VERIFICATION });
    await this.otpModel.create({ email: user.email, code, purpose: OtpPurpose.EMAIL_VERIFICATION });

    await this.mailService.sendOtp(user.email, code, user.name);
    return { message: `Verification OTP sent to ${user.email}. It expires in 10 minutes.` };
  }

  // ─── Email verification — verify OTP ─────────────────────────────────────
  async verifyEmail(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user.email) throw new BadRequestException('No email address on this account');
    if (user.emailVerified) throw new BadRequestException('Email is already verified');

    const record = await this.otpModel.findOne({
      email: user.email,
      code,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) throw new BadRequestException('Invalid or expired OTP');

    await record.updateOne({ verified: true });
    await this.usersService.update(userId, { emailVerified: true });

    return { message: 'Email verified successfully' };
  }

  // ─── Forgot password — send OTP to email ─────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('No account found with this email');
    if (!user.password) {
      throw new BadRequestException('This account uses Google login — password reset is not available');
    }

    const code = Math.floor(100_000 + Math.random() * 900_000).toString();

    // Invalidate any existing password-reset OTPs for this email
    await this.otpModel.deleteMany({ email, purpose: OtpPurpose.PASSWORD_RESET });
    await this.otpModel.create({ email, code, purpose: OtpPurpose.PASSWORD_RESET });

    await this.mailService.sendOtp(email, code, user.name);
    return { message: 'OTP sent to your email. It expires in 10 minutes.' };
  }

  // ─── Reset password — verify OTP then set new password ───────────────────
  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    const record = await this.otpModel.findOne({
      email,
      code: otp,
      purpose: OtpPurpose.PASSWORD_RESET,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) throw new BadRequestException('Invalid or expired OTP');

    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersService.update((user._id as any).toString(), { password: hashed });

    // Mark OTP used and revoke all refresh tokens for security
    await record.updateOne({ verified: true });
    await this.revokeAllTokens((user._id as any).toString());

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }
}
