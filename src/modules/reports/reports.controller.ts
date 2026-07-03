import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@shared/enums';
import { ReportsService } from './reports.service';

/** Tenant surface — /api/v1/reports. Admin/teacher dashboards. */
@Controller('reports')
@UseGuards(TenantAuthGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('fees-summary')
  fees() {
    return this.reports.feesSummary();
  }

  @Get('attendance')
  attendance() {
    return this.reports.attendanceSummary();
  }

  @Get('performance')
  performance() {
    return this.reports.performanceSummary();
  }
}
