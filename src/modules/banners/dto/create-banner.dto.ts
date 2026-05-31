import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BannerType } from '../schemas/banner.schema';

export class CreateBannerDto {
  @ApiProperty({ example: 'Summer Collection is Live' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Up to 40% off on all jewellery' })
  @IsOptional() @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Image URL (use if not uploading a file)' })
  @IsOptional() @IsString()
  image?: string;

  @ApiPropertyOptional({ example: '/collection?category=Necklaces' })
  @IsOptional() @IsString()
  link?: string;

  @ApiPropertyOptional({ enum: BannerType, default: BannerType.HERO })
  @IsOptional() @IsEnum(BannerType)
  type?: BannerType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:00.000Z' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Sale' })
  @IsOptional() @IsString()
  badge?: string;

  @ApiPropertyOptional({ example: 'Shop Now' })
  @IsOptional() @IsString()
  ctaText?: string;
}
