import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TenantPrincipal } from '@shared/auth.types';
import { NotificationsService } from './notifications.service';

/** Tenant surface — /api/v1/notifications. A user's own inbox. */
@Controller('notifications')
@UseGuards(TenantAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: TenantPrincipal) {
    return this.notifications.list(user.userId);
  }
}
