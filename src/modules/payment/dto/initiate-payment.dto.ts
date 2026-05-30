import { IsArray, IsString, IsNumber, IsObject, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PaymentOrderItemDto {
  @IsString() productId: string;
  @IsString() name: string;
  @IsNumber() @Min(0) price: number;
  @IsNumber() @Min(1) quantity: number;
  @IsString() image: string;
}

class PaymentShippingAddressDto {
  @IsString() name: string;
  @IsString() phone: string;
  @IsString() line1: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() pincode: string;
}

export class InitiatePaymentDto {
  @ApiProperty({ type: [PaymentOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentOrderItemDto)
  items: PaymentOrderItemDto[];

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => PaymentShippingAddressDto)
  shippingAddress: PaymentShippingAddressDto;

  @ApiProperty({ default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;
}
