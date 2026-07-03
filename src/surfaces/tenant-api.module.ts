import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { TenantAuthController } from '../auth/tenant/tenant-auth.controller';
import { FeesModule } from '../modules/fees/fees.module';

// Schemas
import { User, UserSchema } from '../modules/users/user.schema';
import { Student, StudentSchema } from '../modules/students/student.schema';
import { Batch, BatchSchema } from '../modules/batches/batch.schema';
import { FeeInvoice, FeeInvoiceSchema } from '../modules/fees/schemas/fee-invoice.schema';
import { Attendance, AttendanceSchema } from '../modules/attendance/attendance.schema';
import { Assignment, AssignmentSchema } from '../modules/academics/schemas/assignment.schema';
import { Submission, SubmissionSchema } from '../modules/academics/schemas/submission.schema';
import { Test, TestSchema } from '../modules/academics/schemas/test.schema';
import { TestScore, TestScoreSchema } from '../modules/academics/schemas/test-score.schema';
import { Material, MaterialSchema } from '../modules/materials/material.schema';
import { Lead, LeadSchema } from '../modules/leads/lead.schema';
import { Notification, NotificationSchema } from '../modules/notifications/notification.schema';

// Services + controllers
import { StudentsService } from '../modules/students/students.service';
import { StudentsController } from '../modules/students/students.controller';
import { BatchesService } from '../modules/batches/batches.service';
import { BatchesController } from '../modules/batches/batches.controller';
import { FeesController } from '../modules/fees/fees.controller';
import { AttendanceService } from '../modules/attendance/attendance.service';
import { AttendanceController } from '../modules/attendance/attendance.controller';
import { AcademicsService } from '../modules/academics/academics.service';
import { AcademicsController } from '../modules/academics/academics.controller';
import { MaterialsService } from '../modules/materials/materials.service';
import { MaterialsController } from '../modules/materials/materials.controller';
import { LeadsService } from '../modules/leads/leads.service';
import { LeadsController } from '../modules/leads/leads.controller';
import { NotificationsController } from '../modules/notifications/notifications.controller';
import { ReportsService } from '../modules/reports/reports.service';
import { ReportsController } from '../modules/reports/reports.controller';

/**
 * Tenant surface — everything under /api/v1. All feature controllers apply
 * TenantAuthGuard (per-controller) so requests are scoped to one tenant by the
 * Mongoose plugin. NOTE: the Razorpay webhook is intentionally NOT here — it is
 * public and mounted at the app root (see WebhooksModule) so it lives outside
 * the /api/v1 prefix and the tenant guard.
 */
@Module({
  imports: [
    AuthModule,
    FeesModule, // provides FeesService + NotificationsService (+ their models)
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Batch.name, schema: BatchSchema },
      { name: FeeInvoice.name, schema: FeeInvoiceSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Test.name, schema: TestSchema },
      { name: TestScore.name, schema: TestScoreSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    RouterModule.register([{ path: 'api/v1', module: TenantApiModule }]),
  ],
  controllers: [
    TenantAuthController,
    StudentsController,
    BatchesController,
    FeesController,
    AttendanceController,
    AcademicsController,
    MaterialsController,
    LeadsController,
    NotificationsController,
    ReportsController,
  ],
  providers: [
    StudentsService,
    BatchesService,
    AttendanceService,
    AcademicsService,
    MaterialsService,
    LeadsService,
    ReportsService,
  ],
})
export class TenantApiModule {}
