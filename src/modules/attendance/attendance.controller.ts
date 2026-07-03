import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantPrincipal } from '@shared/auth.types';
import { UserRole } from '@shared/enums';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto, QueryAttendanceDto } from './dto/attendance.dto';

/** Tenant surface — /api/v1/attendance. */
@Controller('attendance')
@UseGuards(TenantAuthGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('mark')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  mark(@CurrentUser() user: TenantPrincipal, @Body() dto: MarkAttendanceDto) {
    return this.attendance.mark(user.userId, dto);
  }

  @Get()
  query(@Query() dto: QueryAttendanceDto) {
    return this.attendance.query(dto);
  }
}
