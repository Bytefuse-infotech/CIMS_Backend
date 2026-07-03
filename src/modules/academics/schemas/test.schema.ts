import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { tenantPlugin } from '@common/tenant.plugin';

export type TestDocument = HydratedDocument<Test>;

@Schema({ timestamps: true })
export class Test {
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true, index: true })
  batchId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, min: 1 })
  maxMarks!: number;

  @Prop({ required: true })
  date!: Date;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const TestSchema = SchemaFactory.createForClass(Test);
TestSchema.plugin(tenantPlugin);
TestSchema.index({ tenantId: 1, batchId: 1, date: -1 });
