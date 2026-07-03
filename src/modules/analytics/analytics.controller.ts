import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/platform/platform-auth.guard';
import { CurrentPlatformUser } from '@common/decorators/current-user.decorator';
import { PlatformPrincipal } from '@shared/auth.types';
import { AnalyticsService } from './analytics.service';

/** Platform surface — mounted at /platform/v1/analytics. */
@Controller('analytics')
@UseGuards(PlatformAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentPlatformUser() actor: PlatformPrincipal) {
    return this.analytics.overview(actor.platformUserId);
  }
}
