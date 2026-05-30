import { IsPhoneNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number in E.164 format' })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;
}
