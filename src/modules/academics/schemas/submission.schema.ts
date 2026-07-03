import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { tenantPlugin } from '@common/tenant.plugin';

export type SubmissionDocument = HydratedDocument<Submission>;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true, index: true })
  assignmentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId!: Types.ObjectId;

  @Prop({ required: true })
  fileUrl!: string;

  @Prop({ default: () => new Date() })
  submittedAt!: Date;

  @Prop()
  grade?: string;

  @Prop()
  feedback?: string;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
SubmissionSchema.plugin(tenantPlugin);
// One submission per student per assignment.
SubmissionSchema.index({ tenantId: 1, assignmentId: 1, studentId: 1 }, { unique: true });
