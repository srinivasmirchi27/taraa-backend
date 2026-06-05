import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @Version(VERSION_NEUTRAL)
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
  @Version(VERSION_NEUTRAL)
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'taraa-api' };
  }

  @Get('ping')
  @Version(VERSION_NEUTRAL)
  @ApiOperation({ summary: 'Ping — lightweight liveness check' })
  ping() {
    return { status: 'ok' };
  }
}
