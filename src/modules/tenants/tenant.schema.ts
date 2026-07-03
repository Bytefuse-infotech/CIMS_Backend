import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TenantStatus } from '@shared/enums';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ _id: false })
export class TenantSettings {
  @Prop({ type: [Number], default: [7, 3, 1] })
  feeReminderDays!: number[];

  @Prop({ default: 'INR' })
  currency!: string;
}
const TenantSettingsSchema = SchemaFactory.createForClass(TenantSettings);

/**
 * An institute (customer). Platform-owned — NOT tenant-scoped; the platform
 * surface manages these directly. Its _id IS the tenantId that scopes every
 * tenant-level collection.
 */
@Schema({ collection: 'tenants', timestamps: true })
export class Tenant {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  subdomain!: string;

  @Prop({ type: Types.ObjectId, ref: 'Plan' })
  planId?: Types.ObjectId;

  @Prop({ default: 'Asia/Kolkata' })
  timezone!: string;

  @Prop({ type: TenantSettingsSchema, default: () => ({}) })
  settings!: TenantSettings;

  @Prop({ required: true, enum: TenantStatus, default: TenantStatus.PENDING, index: true })
  status!: TenantStatus;

  /** Per-tenant feature flag overrides layered on top of the plan's features. */
  @Prop({ type: Object, default: {} })
  flags!: Record<string, boolean>;

  _id!: Types.ObjectId;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
