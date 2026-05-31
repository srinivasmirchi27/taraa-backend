import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP sent to the phone' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
