import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { tenantPlugin } from '@common/tenant.plugin';

export type BatchDocument = HydratedDocument<Batch>;

@Schema({ _id: false })
export class ScheduleSlot {
  @Prop({ required: true })
  day!: string; // 'mon'..'sun'

  @Prop({ required: true })
  startTime!: string; // 'HH:mm'

  @Prop({ required: true })
  endTime!: string;
}
const ScheduleSlotSchema = SchemaFactory.createForClass(ScheduleSlot);

@Schema({ timestamps: true })
export class Batch {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  teacherIds!: Types.ObjectId[];

  @Prop({ type: [ScheduleSlotSchema], default: [] })
  schedule!: ScheduleSlot[];

  @Prop({ required: true })
  academicYear!: string;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const BatchSchema = SchemaFactory.createForClass(Batch);
BatchSchema.plugin(tenantPlugin);
BatchSchema.index({ tenantId: 1, academicYear: 1 });
