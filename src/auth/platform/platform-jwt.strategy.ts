import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Realm } from '@shared/enums';
import { PlatformJwtPayload, PlatformPrincipal } from '@shared/auth.types';

/**
 * Validates platform-realm access tokens. Signed with PLATFORM_JWT_SECRET.
 * A tenant token fails signature verification here; and even if it didn't,
 * the realm check rejects it.
 */
@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('PLATFORM_JWT_SECRET'),
    });
  }

  validate(payload: PlatformJwtPayload): PlatformPrincipal {
    if (payload.realm !== Realm.PLATFORM) {
      throw new UnauthorizedException('Not a platform-realm token');
    }
    return {
      platformUserId: payload.sub,
      superRole: payload.superRole,
    };
  }
}
