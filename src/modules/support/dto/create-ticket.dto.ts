import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory } from '../schemas/ticket.schema';

export class CreateTicketDto {
  @ApiProperty({ example: 'My order has not arrived' })
  @IsString() @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'I placed order TRA20260531001 on May 31 and it has not arrived yet.' })
  @IsString() @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: TicketCategory, default: TicketCategory.OTHER })
  @IsOptional() @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ example: 'TRA20260531001', description: 'Related order number (optional)' })
  @IsOptional() @IsString()
  orderNumber?: string;

  // Required only for guests (unauthenticated)
  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional() @IsString()
  guestName?: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  @IsOptional() @IsEmail()
  guestEmail?: string;
}
