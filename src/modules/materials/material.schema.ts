import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MaterialType } from '@shared/enums';
import { tenantPlugin } from '@common/tenant.plugin';

export type MaterialDocument = HydratedDocument<Material>;

/** Study material. Files live in CDN-backed storage; we store the keys/urls. */
@Schema({ timestamps: true })
export class Material {
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true, index: true })
  batchId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, enum: MaterialType })
  type!: MaterialType;

  /** Origin storage key/url (private). */
  @Prop({ required: true })
  fileUrl!: string;

  /** CDN-fronted url served to clients. */
  @Prop()
  cdnUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId;

  tenantId!: string;
  _id!: Types.ObjectId;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
MaterialSchema.plugin(tenantPlugin);
MaterialSchema.index({ tenantId: 1, batchId: 1 });
