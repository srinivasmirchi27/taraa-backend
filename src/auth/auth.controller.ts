import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { GoogleTokenDto } from './dto/google-token.dto';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Email / Password ─────────────────────────────────────────────────────────

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  @ApiBody({ type: LoginDto })
  login(@Request() req: any) {
    return this.authService.login(req.user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account — returns tokens immediately. Phone is verified separately via Firebase OTP on the client.' })
  register(@Body() dto: RegisterDto, @Request() req: any) {
    return this.authService.register(dto.name, dto.email, dto.password, dto.phone, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  // ─── Google OAuth — Web redirect flow ────────────────────────────────────────
  // Step 1: redirect browser to Google consent screen
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google OAuth consent screen (web)' })
  googleAuth() {
    // Passport handles the redirect — nothing to return
  }

  // Step 2: Google redirects back here with an auth code
  // Passport exchanges it for a profile, then we issue tokens and redirect to frontend
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — do not call directly' })
  async googleCallback(@Request() req: any, @Response() res: any) {
    const result = await this.authService.googleLogin(req.user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isNew: String(result.isNew),
    });
    return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }

  // ─── Google OAuth — Mobile / SPA token flow ───────────────────────────────────
  // Frontend uses Google Sign-In SDK → sends idToken here → gets app JWT back
  @Public()
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a Google ID token (from mobile/SPA) for app JWT + refresh token' })
  googleTokenLogin(@Body() dto: GoogleTokenDto, @Request() req: any) {
    return this.authService.googleTokenLogin(dto.idToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  // ─── Token management ─────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — revokes the current refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.revokeRefreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  logoutAll(@CurrentUser() user: any) {
    return this.authService.revokeAllTokens(user.id);
  }

  // ─── Forgot / Reset password ──────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a 6-digit OTP to the account email for password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and set a new password' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  // ─── Phone verification ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to a phone number for verification (must be logged in)' })
  sendPhoneOtp(@Body() dto: SendPhoneOtpDto, @CurrentUser() user: any) {
    return this.authService.sendPhoneVerificationOtp(user.id, dto.phone);
  }

  @UseGuards(JwtAuthGuard)
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone OTP and mark phone as verified on the account' })
  verifyPhone(@Body() dto: VerifyPhoneOtpDto, @CurrentUser() user: any) {
    return this.authService.verifyPhone(user.id, dto.phone, dto.otp);
  }

  // ─── Email verification ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification OTP to the logged-in user\'s email' })
  sendEmailVerification(@CurrentUser() user: any) {
    return this.authService.sendEmailVerificationOtp(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email OTP and mark email as verified on the account' })
  verifyEmail(@Body() dto: VerifyEmailOtpDto, @CurrentUser() user: any) {
    return this.authService.verifyEmail(user.id, dto.otp);
  }
}
