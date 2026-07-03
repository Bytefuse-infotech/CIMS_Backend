import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PlanTier } from '@shared/enums';

export type PlanDocument = HydratedDocument<Plan>;

@Schema({ _id: false })
export class PlanLimits {
  @Prop({ required: true, default: 100 })
  students!: number;

  @Prop({ required: true, default: 5 })
  storageGb!: number;
}
const PlanLimitsSchema = SchemaFactory.createForClass(PlanLimits);

/** Subscription tier the platform sells to institutes. Platform-owned. */
@Schema({ collection: 'plans', timestamps: true })
export class Plan {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: PlanTier, index: true })
  tier!: PlanTier;

  @Prop({ required: true, default: 0 })
  priceMonthly!: number;

  @Prop({ type: PlanLimitsSchema, default: () => ({}) })
  limits!: PlanLimits;

  @Prop({ type: [String], default: [] })
  features!: string[];

  _id!: Types.ObjectId;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
