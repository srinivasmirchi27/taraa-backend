import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Your app order ID (MongoDB _id)' })
  @IsString()
  @IsNotEmpty()
  appOrderId: string;

  @ApiProperty({ description: 'Razorpay order ID returned by /payments/initiate' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ description: 'Razorpay payment ID from checkout callback' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ description: 'Razorpay signature from checkout callback' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}
