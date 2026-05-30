import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { FirebaseVerifyDto } from './dto/firebase-verify.dto';
import { Public } from '../../decorators/public.decorator';

@ApiTags('OTP / Phone Auth')
@Controller('auth')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  // POST /api/v1/auth/otp/send
  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a 6-digit OTP to a phone number' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  // POST /api/v1/auth/otp/verify
  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP — returns app JWT + isNewUser flag' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.phone, dto.otp);
  }

  // POST /api/v1/auth/phone-login
  // Use this when the client has already done Firebase phone auth
  @Public()
  @Post('phone-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a Firebase ID token (phone auth) for an app JWT' })
  firebasePhoneLogin(@Body() dto: FirebaseVerifyDto) {
    return this.otpService.verifyFirebaseToken(dto.idToken);
  }
}
