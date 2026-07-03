import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@shared/enums';
import { BatchesService } from './batches.service';
import { CreateBatchDto, EnrollDto, UpdateBatchDto } from './dto/batch.dto';

/** Tenant surface — /api/v1/batches. */
@Controller('batches')
@UseGuards(TenantAuthGuard)
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get()
  list() {
    return this.batches.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.batches.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateBatchDto) {
    return this.batches.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.batches.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.batches.remove(id);
  }

  @Post(':id/enroll')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  enroll(@Param('id') id: string, @Body() dto: EnrollDto) {
    return this.batches.enroll(id, dto.studentIds);
  }
}
