import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
import { MailService } from '../modules/mail/mail.service';
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
    private readonly mailService: MailService,
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

  async register(name: string, email: string, password: string, meta?: { userAgent?: string; ip?: string }) {
    const hashed = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ name, email, password: hashed });
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
}
