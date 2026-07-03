import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { tenantPlugin } from '@common/tenant.plugin';

export type AssignmentDocument = HydratedDocument<Assignment>;

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true, index: true })
  batchId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop()
  attachmentUrl?: string;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
AssignmentSchema.plugin(tenantPlugin);
AssignmentSchema.index({ tenantId: 1, batchId: 1, dueDate: -1 });
