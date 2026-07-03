import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole, UserStatus } from '@shared/enums';
import { tenantPlugin } from '@common/tenant.plugin';

export type UserDocument = HydratedDocument<User>;

/**
 * Tenant-level institute user (admin / teacher / student / parent).
 * Tenant-scoped: the tenant plugin adds and enforces tenantId.
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, enum: UserRole, index: true })
  role!: UserRole;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ trim: true })
  phone?: string;

  /** argon2 hash. Not selected by default; explicitly `.select('+passwordHash')`. */
  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ type: [String], default: [] })
  fcmTokens!: string[];

  @Prop({ enum: UserStatus, default: UserStatus.INVITED, index: true })
  status!: UserStatus;

  /** Set for invited users until they accept and set a password. */
  @Prop({ select: false })
  inviteTokenHash?: string;

  @Prop()
  inviteExpiresAt?: Date;

  // tenantId is injected by tenantPlugin
  tenantId!: string;
  _id!: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(tenantPlugin);

// Email unique per tenant (not globally — same email can exist across institutes).
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1, status: 1 });
