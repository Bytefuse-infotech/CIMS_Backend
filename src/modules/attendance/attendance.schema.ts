import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AttendanceSource, AttendanceStatus } from '@shared/enums';
import { tenantPlugin } from '@common/tenant.plugin';

export type AttendanceDocument = HydratedDocument<Attendance>;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true, index: true })
  batchId!: Types.ObjectId;

  /** Date-only (midnight) marker for the class day. */
  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true, enum: AttendanceStatus })
  status!: AttendanceStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  markedBy?: Types.ObjectId;

  @Prop({ enum: AttendanceSource, default: AttendanceSource.MANUAL })
  source!: AttendanceSource;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.plugin(tenantPlugin);
// One record per student/batch/day.
AttendanceSchema.index({ tenantId: 1, studentId: 1, batchId: 1, date: 1 }, { unique: true });
