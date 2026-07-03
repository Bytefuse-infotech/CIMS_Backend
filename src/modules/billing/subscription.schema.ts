import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubscriptionStatus } from '@shared/enums';

export type SubscriptionDocument = HydratedDocument<Subscription>;

/**
 * The institute's subscription to the platform (what YOU bill the institute).
 * Distinct from parent fee payments on the tenant surface. Platform-owned.
 */
@Schema({ collection: 'subscriptions', timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  planId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIALING,
    index: true,
  })
  status!: SubscriptionStatus;

  @Prop()
  currentPeriodEnd?: Date;

  /** Reference in the billing gateway (deferred integration). */
  @Prop()
  gatewayRef?: string;

  _id!: Types.ObjectId;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ tenantId: 1, status: 1 });
