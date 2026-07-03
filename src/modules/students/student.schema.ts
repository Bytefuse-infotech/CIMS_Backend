import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { tenantPlugin } from '@common/tenant.plugin';

export type StudentDocument = HydratedDocument<Student>;

/** A student profile, linked to a User (role=student) and a parent User. */
@Schema({ timestamps: true })
export class Student {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  parentUserId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Batch' }], default: [] })
  batchIds!: Types.ObjectId[];

  @Prop({ required: true })
  rollNo!: string;

  @Prop()
  admissionDate?: Date;

  @Prop()
  biometricId?: string;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
StudentSchema.plugin(tenantPlugin);
StudentSchema.index({ tenantId: 1, rollNo: 1 }, { unique: true });
StudentSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
