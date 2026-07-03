import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '@shared/enums';
import { tenantPlugin } from '@common/tenant.plugin';

export type NotificationDocument = HydratedDocument<Notification>;

/**
 * A notification record. The delivery integrations (FCM push, SMS) are deferred;
 * this stores the intent + status so a channel provider can pick it up later.
 */
@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: NotificationChannel, default: NotificationChannel.PUSH })
  channel!: NotificationChannel;

  @Prop({ required: true })
  type!: string; // 'fee_due' | 'invoice_paid' | 'absence' | 'assignment' | 'graded' ...

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: Object })
  data?: Record<string, unknown>;

  @Prop({
    required: true,
    enum: NotificationStatus,
    default: NotificationStatus.QUEUED,
    index: true,
  })
  status!: NotificationStatus;

  @Prop()
  sentAt?: Date;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.plugin(tenantPlugin);
NotificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
