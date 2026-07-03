import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeePlan, FeePlanSchema } from './schemas/fee-plan.schema';
import { FeeInvoice, FeeInvoiceSchema } from './schemas/fee-invoice.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Student, StudentSchema } from '../students/student.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { FeesService } from './fees.service';

/**
 * Fees domain, packaged as a module so BOTH the tenant surface (fee plans,
 * invoices, payment orders) and the public webhook surface (payment capture)
 * can consume FeesService without duplicating providers.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeePlan.name, schema: FeePlanSchema },
      { name: FeeInvoice.name, schema: FeeInvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [FeesService, NotificationsService],
  exports: [FeesService, NotificationsService, MongooseModule],
})
export class FeesModule {}
