import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Rings' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rings' })
  @IsString() @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Min(0)
  sortOrder?: number;
}
