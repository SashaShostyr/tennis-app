import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // Unauthenticated liveness check for the platform (Render health check).
  @Get()
  check() {
    return { status: 'ok' };
  }
}
