import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/platform/platform-auth.guard';
import { CurrentPlatformUser } from '@common/decorators/current-user.decorator';
import { SuperRoles } from '@common/decorators/roles.decorator';
import { PlatformPrincipal } from '@shared/auth.types';
import { SuperRole } from '@shared/enums';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateFlagsDto, UpdateTenantStatusDto } from './dto/tenant.dto';

/** Platform surface — mounted at /platform/v1/tenants. */
@Controller('tenants')
@UseGuards(PlatformAuthGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list() {
    return this.tenants.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tenants.get(id);
  }

  @Post()
  @SuperRoles(SuperRole.OWNER)
  provision(@CurrentPlatformUser() actor: PlatformPrincipal, @Body() dto: CreateTenantDto) {
    return this.tenants.provision(actor.platformUserId, dto);
  }

  @Patch(':id')
  @SuperRoles(SuperRole.OWNER)
  setStatus(
    @CurrentPlatformUser() actor: PlatformPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.tenants.setStatus(actor.platformUserId, id, dto.status);
  }

  @Patch(':id/flags')
  @SuperRoles(SuperRole.OWNER)
  updateFlags(
    @CurrentPlatformUser() actor: PlatformPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateFlagsDto,
  ) {
    return this.tenants.updateFlags(actor.platformUserId, id, dto);
  }
}
