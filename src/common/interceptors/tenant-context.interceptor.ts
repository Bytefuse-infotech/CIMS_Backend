import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { defer, Observable } from 'rxjs';
import { TenantContextStore } from '../tenant-context';

/**
 * Wraps each request handler in an AsyncLocalStorage context carrying the
 * request's tenantId (set by TenantAuthGuard). Every Mongoose query issued
 * inside the handler is then automatically scoped by the tenant plugin.
 *
 * On the platform surface no tenantId is set here; platform services opt into
 * cross-tenant access explicitly via TenantContextStore.runWithBypass, which is
 * audited.
 *
 * We use `defer` so the context is established at SUBSCRIBE time and remains
 * bound while the controller's async work runs, not merely while the
 * interceptor function executes synchronously.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const tenantId: string | undefined = req.tenantId;

    if (!tenantId) {
      // No tenant on this request (public route or platform surface) — run as-is.
      return next.handle();
    }

    return defer(() =>
      TenantContextStore.run({ tenantId }, () => next.handle()),
    ) as Observable<unknown>;
  }
}
