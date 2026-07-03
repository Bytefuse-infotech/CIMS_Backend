import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantPrincipal } from '@shared/auth.types';
import { UserRole } from '@shared/enums';
import { AcademicsService } from './academics.service';
import {
  CreateAssignmentDto,
  CreateTestDto,
  GradeSubmissionDto,
  RecordScoreDto,
  SubmitAssignmentDto,
} from './dto/academics.dto';

/** Tenant surface — /api/v1. Assignments, submissions, tests, scores. */
@Controller()
@UseGuards(TenantAuthGuard)
export class AcademicsController {
  constructor(private readonly academics: AcademicsService) {}

  // Assignments
  @Get('assignments')
  listAssignments(@Query('batchId') batchId?: string) {
    return this.academics.listAssignments(batchId);
  }

  @Post('assignments')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  createAssignment(@CurrentUser() user: TenantPrincipal, @Body() dto: CreateAssignmentDto) {
    return this.academics.createAssignment(user.userId, dto);
  }

  @Post('assignments/:id/submit')
  @Roles(UserRole.STUDENT)
  submit(@Param('id') id: string, @Body() dto: SubmitAssignmentDto) {
    return this.academics.submit(id, dto);
  }

  @Get('assignments/:id/submissions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  listSubmissions(@Param('id') id: string) {
    return this.academics.listSubmissions(id);
  }

  @Post('submissions/:id/grade')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  grade(@Param('id') id: string, @Body() dto: GradeSubmissionDto) {
    return this.academics.grade(id, dto);
  }

  // Tests
  @Get('tests')
  listTests(@Query('batchId') batchId?: string) {
    return this.academics.listTests(batchId);
  }

  @Post('tests')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  createTest(@Body() dto: CreateTestDto) {
    return this.academics.createTest(dto);
  }

  @Post('tests/:id/scores')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  recordScore(@Param('id') id: string, @Body() dto: RecordScoreDto) {
    return this.academics.recordScore(id, dto);
  }

  @Get('tests/:id/scores')
  listScores(@Param('id') id: string) {
    return this.academics.listScores(id);
  }
}
