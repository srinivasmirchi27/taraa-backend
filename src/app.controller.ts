import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root — returns version info' })
  root() {
    return {
      success: true,
      message: 'Welcome to Taraa API 🎉',
      version: '1.0',
      docs: '/api/docs',
      health: '/health',
      ping: '/ping',
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
