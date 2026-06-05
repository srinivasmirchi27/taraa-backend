import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root — returns version info' })
  root() {
    return {
      name: 'Taraa API',
      version: '1.0',
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'taraa-api' };
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping — lightweight liveness check' })
  ping() {
    return { status: 'ok' };
  }
}
