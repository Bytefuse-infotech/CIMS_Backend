import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

export interface AuditEntry {
  actor: string;
  action: string;
  targetTenantId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Writes platform-surface audit entries. Auditing must never break the primary
 * operation, so failures are logged, not thrown.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.auditModel.create(entry);
    } catch (err) {
      this.logger.error(
        `Failed to write audit log for action "${entry.action}" by "${entry.actor}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async list(filter: {
    actor?: string;
    action?: string;
    targetTenantId?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const query: Record<string, unknown> = {};
    if (filter.actor) query.actor = filter.actor;
    if (filter.action) query.action = filter.action;
    if (filter.targetTenantId) query.targetTenantId = filter.targetTenantId;
    return this.auditModel
      .find(query)
      .sort({ at: -1 })
      .limit(Math.min(filter.limit ?? 100, 500))
      .lean()
      .exec();
  }
}
