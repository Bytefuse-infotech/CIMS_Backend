import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { tenantPlugin } from '@common/tenant.plugin';

export type TestScoreDocument = HydratedDocument<TestScore>;

@Schema({ timestamps: true })
export class TestScore {
  @Prop({ type: Types.ObjectId, ref: 'Test', required: true, index: true })
  testId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  marks!: number;

  @Prop()
  remarks?: string;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const TestScoreSchema = SchemaFactory.createForClass(TestScore);
TestScoreSchema.plugin(tenantPlugin);
TestScoreSchema.index({ tenantId: 1, testId: 1, studentId: 1 }, { unique: true });
