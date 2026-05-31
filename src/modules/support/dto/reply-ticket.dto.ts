import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyTicketDto {
  @ApiProperty({ example: 'Thank you for reaching out. Your order is on its way!' })
  @IsString() @IsNotEmpty()
  message: string;
}
