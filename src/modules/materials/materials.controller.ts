import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantPrincipal } from '@shared/auth.types';
import { UserRole } from '@shared/enums';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, UploadUrlDto } from './dto/material.dto';

/** Tenant surface — /api/v1/materials. */
@Controller('materials')
@UseGuards(TenantAuthGuard)
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list(@Query('batchId') batchId?: string) {
    return this.materials.list(batchId);
  }

  @Post('upload-url')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  uploadUrl(@Body() dto: UploadUrlDto) {
    return this.materials.createUploadUrl(dto.filename);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(@CurrentUser() user: TenantPrincipal, @Body() dto: CreateMaterialDto) {
    return this.materials.create({ ...dto, uploadedBy: user.userId });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  remove(@Param('id') id: string) {
    return this.materials.remove(id);
  }
}
