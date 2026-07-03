import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { tenantPlugin } from '@common/tenant.plugin';

export type FeePlanDocument = HydratedDocument<FeePlan>;

@Schema({ _id: false })
export class Installment {
  @Prop({ required: true })
  label!: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true })
  dueDate!: Date;
}
const InstallmentSchema = SchemaFactory.createForClass(Installment);

/** A fee structure that generates invoices for enrolled students. */
@Schema({ timestamps: true })
export class FeePlan {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ type: Types.ObjectId, ref: 'Batch' })
  batchId?: Types.ObjectId;

  @Prop({ type: [InstallmentSchema], default: [] })
  installments!: Installment[];

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const FeePlanSchema = SchemaFactory.createForClass(FeePlan);
FeePlanSchema.plugin(tenantPlugin);
