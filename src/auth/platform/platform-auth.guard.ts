import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { SuperRole } from '@shared/enums';
import { PlatformPrincipal } from '@shared/auth.types';
import { IS_PUBLIC_KEY, SUPER_ROLES_KEY } from '@common/decorators/roles.decorator';

/**
 * Platform-surface guard. Validates a platform-realm JWT and enforces superRole
 * metadata. Attaches the platform principal to the request. A tenant token can
 * never satisfy this guard (different secret + realm check in the strategy).
 */
@Injectable()
export class PlatformAuthGuard extends AuthGuard('platform-jwt') {
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

  handleRequest<T = PlatformPrincipal>(
    err: unknown,
    user: T,
    _info: unknown,
    context: ExecutionContext,
  ): T {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or missing platform token');
    }
    const principal = user as unknown as PlatformPrincipal;

    const requiredRoles = this.reflector.getAllAndOverride<SuperRole[]>(SUPER_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(principal.superRole)) {
      throw new ForbiddenException('Insufficient super role for this resource');
    }

    const req = context.switchToHttp().getRequest();
    req.platformUser = principal;
    return user;
  }
}
