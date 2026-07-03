import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LeadStatus } from '@shared/enums';
import { tenantPlugin } from '@common/tenant.plugin';

export type LeadDocument = HydratedDocument<Lead>;

@Schema({ _id: false })
export class LeadNote {
  @Prop({ required: true })
  text!: string;

  @Prop({ default: () => new Date() })
  at!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  by?: Types.ObjectId;
}
const LeadNoteSchema = SchemaFactory.createForClass(LeadNote);

/** A prospective admission (CRM). */
@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop()
  source?: string;

  @Prop({ required: true, enum: LeadStatus, default: LeadStatus.NEW, index: true })
  status!: LeadStatus;

  @Prop({ type: [LeadNoteSchema], default: [] })
  notes!: LeadNote[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.plugin(tenantPlugin);
LeadSchema.index({ tenantId: 1, status: 1 });
