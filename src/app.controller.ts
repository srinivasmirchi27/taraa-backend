import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Health check — confirms API is alive' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'taraa-api' };
  }
}
