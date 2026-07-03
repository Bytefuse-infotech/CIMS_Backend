import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request tenant scoping context, carried via AsyncLocalStorage so that
 * the Mongoose tenant plugin can read `tenantId` without it being threaded
 * through every service call.
 *
 * `bypass: true` is the single most sensitive flag in the system. It is set
 * ONLY on the platform surface via `runWithBypass`, and every use is audited.
 */
export interface TenantContext {
  tenantId?: string;
  /** When true, the tenant plugin does NOT auto-inject tenantId. Platform surface only. */
  bypass?: boolean;
  /** Who authorized a bypass — for the audit trail. */
  bypassActor?: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export const TenantContextStore = {
  /** Run a callback with a bound tenant context. */
  run<T>(context: TenantContext, callback: () => T): T {
    return storage.run(context, callback);
  },

  /** Current context, if any. */
  get(): TenantContext | undefined {
    return storage.getStore();
  },

  /** The active tenantId, or undefined outside a tenant-scoped request. */
  getTenantId(): string | undefined {
    return storage.getStore()?.tenantId;
  },

  /** Whether tenant scoping is currently bypassed (platform surface). */
  isBypassed(): boolean {
    return storage.getStore()?.bypass === true;
  },

  /**
   * Run a callback with tenant scoping bypassed. Platform-surface only.
   * `actor` is the platformUserId performing the cross-tenant operation and is
   * recorded so the bypass is always traceable.
   */
  runWithBypass<T>(actor: string, callback: () => T): T {
    return storage.run({ bypass: true, bypassActor: actor }, callback);
  },
};
