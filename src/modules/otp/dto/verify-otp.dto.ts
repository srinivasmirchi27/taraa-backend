import { IsPhoneNumber, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
