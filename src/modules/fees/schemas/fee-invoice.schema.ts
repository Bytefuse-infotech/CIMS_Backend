import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InvoiceStatus } from '@shared/enums';
import { tenantPlugin } from '@common/tenant.plugin';

export type FeeInvoiceDocument = HydratedDocument<FeeInvoice>;

@Schema({ timestamps: true })
export class FeeInvoice {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'FeePlan', required: true })
  feePlanId!: Types.ObjectId;

  /** Which installment this invoice corresponds to. */
  @Prop({ required: true })
  label!: string;

  @Prop({ required: true, min: 0 })
  amountDue!: number;

  @Prop({ required: true, default: 0, min: 0 })
  amountPaid!: number;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.PENDING, index: true })
  status!: InvoiceStatus;

  @Prop()
  receiptUrl?: string;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const FeeInvoiceSchema = SchemaFactory.createForClass(FeeInvoice);
FeeInvoiceSchema.plugin(tenantPlugin);
// Supports the reminder job: find pending/overdue invoices by due date.
FeeInvoiceSchema.index({ tenantId: 1, status: 1, dueDate: 1 });
FeeInvoiceSchema.index({ tenantId: 1, studentId: 1 });
