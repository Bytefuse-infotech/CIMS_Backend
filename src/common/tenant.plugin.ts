import { Schema } from 'mongoose';
import { TenantContextStore } from './tenant-context';

/**
 * Mongoose plugin that enforces tenant isolation on any schema it is applied to.
 *
 * It does three things, all driven by the AsyncLocalStorage tenant context:
 *  1. Adds a required, indexed `tenantId` field.
 *  2. On every read/update/delete query, injects `{ tenantId }` into the filter
 *     so a query physically cannot span tenants.
 *  3. On every document save/insert, stamps `tenantId` from context.
 *
 * When the context is in bypass mode (platform surface, audited), none of the
 * injection happens — the caller is trusted to have authorized cross-tenant access.
 *
 * A query outside any tenant context, with no bypass, throws — this is a
 * fail-closed guard so a forgotten context can never silently leak all tenants.
 */

// Query middleware hooks that carry a filter we must scope.
const QUERY_HOOKS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'count',
  'countDocuments',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'replaceOne',
] as const;

export function tenantPlugin(schema: Schema): void {
  schema.add({
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
  });

  // ---- Reads / updates / deletes: filter by tenantId ----
  for (const hook of QUERY_HOOKS) {
    schema.pre(hook as any, function (this: any) {
      if (TenantContextStore.isBypassed()) {
        return;
      }
      const tenantId = TenantContextStore.getTenantId();
      if (!tenantId) {
        throw new Error(
          `Tenant-scoped query on "${this.model?.modelName ?? 'unknown'}" ` +
            `ran with no tenant context and no bypass. Refusing to run (fail-closed).`,
        );
      }
      // Force the tenantId into the filter; a caller-supplied tenantId can't widen it.
      this.setQuery({ ...this.getQuery(), tenantId });
    });
  }

  // ---- Aggregations: prepend a $match on tenantId ----
  schema.pre('aggregate', function (this: any) {
    if (TenantContextStore.isBypassed()) {
      return;
    }
    const tenantId = TenantContextStore.getTenantId();
    if (!tenantId) {
      throw new Error(
        `Tenant-scoped aggregation on "${this._model?.modelName ?? 'unknown'}" ` +
          `ran with no tenant context and no bypass. Refusing to run (fail-closed).`,
      );
    }
    this.pipeline().unshift({ $match: { tenantId } });
  });

  // ---- Writes: stamp tenantId from context ----
  // Must run on `validate` (fires BEFORE required-field validation) so the
  // stamped tenantId satisfies the `required: true` rule. A `save` hook would
  // be too late — validation already ran.
  schema.pre('validate', function (this: any) {
    if (TenantContextStore.isBypassed()) {
      // Platform surface may set tenantId explicitly on provisioning writes.
      if (!this.tenantId) {
        throw new Error(
          `Bypass save on "${this.constructor?.modelName ?? 'unknown'}" ` +
            `must set tenantId explicitly.`,
        );
      }
      return;
    }
    const tenantId = TenantContextStore.getTenantId();
    if (!tenantId) {
      throw new Error(`Cannot save tenant document with no tenant context (fail-closed).`);
    }
    if (this.tenantId && this.tenantId !== tenantId) {
      throw new Error(
        `Refusing to save document with tenantId "${this.tenantId}" ` +
          `under context tenant "${tenantId}".`,
      );
    }
    this.tenantId = tenantId;
  });

  // insertMany bypasses `save`; stamp each doc.
  schema.pre('insertMany', function (this: any, next: (err?: Error) => void, docs: any[]) {
    if (TenantContextStore.isBypassed()) {
      return next();
    }
    const tenantId = TenantContextStore.getTenantId();
    if (!tenantId) {
      return next(new Error(`Cannot insertMany tenant documents with no tenant context.`));
    }
    for (const doc of docs) {
      doc.tenantId = tenantId;
    }
    next();
  });
}
