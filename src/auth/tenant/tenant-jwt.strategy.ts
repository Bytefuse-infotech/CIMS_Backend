import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Realm } from '@shared/enums';
import { TenantJwtPayload, TenantPrincipal } from '@shared/auth.types';

/**
 * Validates tenant-realm access tokens. Signed with TENANT_JWT_SECRET, which is
 * distinct from the platform secret — a platform token will fail signature
 * verification here even before the realm check.
 */
@Injectable()
export class TenantJwtStrategy extends PassportStrategy(Strategy, 'tenant-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('TENANT_JWT_SECRET'),
    });
  }

  validate(payload: TenantJwtPayload): TenantPrincipal {
    // Defence in depth: even with a valid signature, reject anything not tenant-realm.
    if (payload.realm !== Realm.TENANT || !payload.tenantId) {
      throw new UnauthorizedException('Not a tenant-realm token');
    }
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      impersonatedBy: payload.impersonatedBy,
    };
  }
}
