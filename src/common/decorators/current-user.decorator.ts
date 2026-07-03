import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PlatformPrincipal, TenantPrincipal } from '@shared/auth.types';

/** Injects the tenant principal attached by the tenant realm guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantPrincipal => {
    return ctx.switchToHttp().getRequest().user;
  },
);

/** Injects the platform principal attached by the platform realm guard. */
export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformPrincipal => {
    return ctx.switchToHttp().getRequest().platformUser;
  },
);
