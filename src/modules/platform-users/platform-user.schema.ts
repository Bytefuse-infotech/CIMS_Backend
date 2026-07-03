import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SuperRole } from '@shared/enums';

export type PlatformUserDocument = HydratedDocument<PlatformUser>;

/**
 * The SaaS owner / support staff. Platform-level — NOT tenant-scoped, so no
 * tenant plugin. Lives entirely on the platform surface.
 */
@Schema({ collection: 'platform_users', timestamps: true })
export class PlatformUser {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, enum: SuperRole, default: SuperRole.SUPPORT })
  superRole!: SuperRole;

  /** TOTP secret for 2FA. Deferred: reserved, not yet enforced. */
  @Prop({ select: false })
  twoFactorSecret?: string;

  _id!: Types.ObjectId;
}

export const PlatformUserSchema = SchemaFactory.createForClass(PlatformUser);
