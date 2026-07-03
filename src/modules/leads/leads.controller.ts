import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantPrincipal } from '@shared/auth.types';
import { LeadStatus, UserRole } from '@shared/enums';
import { LeadsService } from './leads.service';
import { AddNoteDto, CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';

/** Tenant surface — /api/v1/leads. Admin/teacher CRM. */
@Controller('leads')
@UseGuards(TenantAuthGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Query('status') status?: LeadStatus) {
    return this.leads.list(status);
  }

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }

  @Post(':id/notes')
  addNote(@CurrentUser() user: TenantPrincipal, @Param('id') id: string, @Body() dto: AddNoteDto) {
    return this.leads.addNote(id, dto.text, user.userId);
  }
}
