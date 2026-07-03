import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/platform/platform-auth.guard';
import { SuperRoles } from '@common/decorators/roles.decorator';
import { SuperRole } from '@shared/enums';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

/** Platform surface — mounted at /platform/v1/plans. */
@Controller('plans')
@UseGuards(PlatformAuthGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list() {
    return this.plans.list();
  }

  @Post()
  @SuperRoles(SuperRole.OWNER)
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  @Patch(':id')
  @SuperRoles(SuperRole.OWNER)
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }
}
