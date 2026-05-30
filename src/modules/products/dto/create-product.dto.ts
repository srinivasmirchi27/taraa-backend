import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiProperty() @IsNumber() @Min(0) originalPrice: number;
  @ApiProperty() @IsString() image: string;
  @ApiProperty() @IsString() description: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() images?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() badge?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNew?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(5) rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reviews?: number;
}
