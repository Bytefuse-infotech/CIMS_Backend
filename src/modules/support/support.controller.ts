import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/platform/platform-auth.guard';
import { CurrentPlatformUser } from '@common/decorators/current-user.decorator';
import { SuperRoles } from '@common/decorators/roles.decorator';
import { PlatformPrincipal } from '@shared/auth.types';
import { SuperRole } from '@shared/enums';
import { AuditService } from '@common/audit/audit.service';
import { SupportService } from './support.service';

/** Platform surface — mounted at /platform/v1. Impersonation + audit-log viewer. */
@Controller()
@UseGuards(PlatformAuthGuard)
export class SupportController {
  constructor(
    private readonly support: SupportService,
    private readonly audit: AuditService,
  ) {}

  @Post('tenants/:id/impersonate')
  @SuperRoles(SuperRole.OWNER, SuperRole.SUPPORT)
  impersonate(@CurrentPlatformUser() actor: PlatformPrincipal, @Param('id') id: string) {
    return this.support.impersonate(actor.platformUserId, id);
  }

  @Get('audit-log')
  auditLog(
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('targetTenantId') targetTenantId?: string,
  ) {
    return this.audit.list({ actor, action, targetTenantId });
  }
}
