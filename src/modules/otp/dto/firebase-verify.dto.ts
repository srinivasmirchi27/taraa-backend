import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FirebaseVerifyDto {
  @ApiProperty({ description: 'Firebase ID token from client-side phone auth' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
