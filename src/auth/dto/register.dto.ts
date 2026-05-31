import { IsEmail, IsString, IsOptional, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Priya Sharma' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'priya@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Phone with country code — used for OTP verification after registration' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid phone number format' })
  phone?: string;
}
