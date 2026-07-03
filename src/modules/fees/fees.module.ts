import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeePlan, FeePlanSchema } from './schemas/fee-plan.schema';
import { FeeInvoice, FeeInvoiceSchema } from './schemas/fee-invoice.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Student, StudentSchema } from '../students/student.schema';
import { User, UserSchema } from '../users/user.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { StorageService } from '../materials/storage.service';
import { FeesService } from './fees.service';
import { RazorpayGateway } from './razorpay.gateway';
import { ReceiptService } from './receipt.service';

/**
 * Fees domain, packaged as a module so BOTH the tenant surface (fee plans,
 * invoices, payment orders) and the public webhook surface (payment capture)
 * can consume FeesService without duplicating providers. Also owns the shared
 * integration seams (Razorpay, receipts/storage, FCM push) so they're single
 * instances across surfaces.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeePlan.name, schema: FeePlanSchema },
      { name: FeeInvoice.name, schema: FeeInvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Student.name, schema: StudentSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [
    FeesService,
    NotificationsService,
    PushService,
    StorageService,
    RazorpayGateway,
    ReceiptService,
  ],
  exports: [FeesService, NotificationsService, StorageService, RazorpayGateway, MongooseModule],
})
export class FeesModule {}
