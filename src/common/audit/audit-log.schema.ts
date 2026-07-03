import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * Platform-level audit trail. NOT tenant-scoped (no tenant plugin) — it records
 * cross-tenant and platform actions, keyed optionally by the tenant they targeted.
 * Every use of the tenant-scope bypass and every impersonation writes here.
 */
@Schema({ collection: 'audit_logs', timestamps: { createdAt: 'at', updatedAt: false } })
export class AuditLog {
  /** Who performed the action — platformUserId, or a system marker. */
  @Prop({ required: true, index: true })
  actor!: string;

  /** e.g. 'tenant.provision', 'tenant.suspend', 'bypass.query', 'impersonate'. */
  @Prop({ required: true, index: true })
  action!: string;

  /** The tenant affected, when applicable. */
  @Prop({ index: true })
  targetTenantId?: string;

  /** Arbitrary structured detail (before/after, request path, etc.). */
  @Prop({ type: Object })
  meta?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ actor: 1, at: -1 });
AuditLogSchema.index({ targetTenantId: 1, at: -1 });
