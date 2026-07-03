import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentGateway, PaymentStatus } from '@shared/enums';
import { tenantPlugin } from '@common/tenant.plugin';

export type PaymentDocument = HydratedDocument<Payment>;

/**
 * A gateway payment against an invoice. Idempotency of webhook processing rests
 * on the unique `gatewayPaymentId` — a retried webhook can't double-credit.
 */
@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'FeeInvoice', required: true, index: true })
  invoiceId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, enum: PaymentGateway, default: PaymentGateway.RAZORPAY })
  gateway!: PaymentGateway;

  @Prop({ required: true })
  gatewayOrderId!: string;

  /** Unique across the whole system — the idempotency key. Sparse: not set until captured. */
  @Prop({ unique: true, sparse: true })
  gatewayPaymentId?: string;

  @Prop()
  gatewaySignature?: string;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.CREATED, index: true })
  status!: PaymentStatus;

  @Prop()
  paidAt?: Date;

  @Prop()
  receiptUrl?: string;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.plugin(tenantPlugin);
PaymentSchema.index({ tenantId: 1, invoiceId: 1 });
// Note: the unique index on gatewayPaymentId is global (not tenant-led) on
// purpose — a gateway payment id is globally unique and is the idempotency key.
