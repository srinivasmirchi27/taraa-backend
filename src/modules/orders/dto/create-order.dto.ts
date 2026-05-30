import { IsArray, IsString, IsNumber, IsObject, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OrderItemDto {
  @IsString() productId: string;
  @IsString() name: string;
  @IsNumber() @Min(0) price: number;
  @IsNumber() @Min(1) quantity: number;
  @IsString() image: string;
}

class ShippingAddressDto {
  @IsString() name: string;
  @IsString() phone: string;
  @IsString() line1: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() pincode: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ default: 'COD' })
  @IsString()
  paymentMethod: string;
}
