import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { UserRole } from '@shared/enums';
import { TenantPrincipal } from '@shared/auth.types';
import { IS_PUBLIC_KEY, ROLES_KEY } from '@common/decorators/roles.decorator';

/**
 * Tenant-surface guard. Validates a tenant-realm JWT, enforces role metadata,
 * and binds the request's tenant context so the Mongoose plugin scopes queries.
 *
 * NOTE: the actual tenant context binding happens in TenantContextInterceptor
 * (which wraps the whole handler in AsyncLocalStorage.run). This guard only
 * authenticates/authorizes and attaches the principal; see main.ts wiring.
 */
@Injectable()
export class TenantAuthGuard extends AuthGuard('tenant-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<T = TenantPrincipal>(
    err: unknown,
    user: T,
    _info: unknown,
    context: ExecutionContext,
  ): T {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or missing tenant token');
    }
    const principal = user as unknown as TenantPrincipal;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(principal.role)) {
      throw new ForbiddenException('Insufficient role for this resource');
    }

    // Make tenantId available to the context interceptor via the request object.
    const req = context.switchToHttp().getRequest();
    req.tenantId = principal.tenantId;
    return user;
  }
}
