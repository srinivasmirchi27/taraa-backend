import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleTokenDto {
  @ApiProperty({ description: 'Google ID token from Google Sign-In SDK (mobile/SPA)' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
