import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'priya@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP from email' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'NewSecure@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
