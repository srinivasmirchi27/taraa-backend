import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailOtpDto {
  @ApiProperty({ example: '829103', description: '6-digit OTP sent to your email' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
