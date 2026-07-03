import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Realm, SuperRole, UserRole } from '@shared/enums';
import { AuthTokens, PlatformJwtPayload, TenantJwtPayload } from '@shared/auth.types';
import { RealmJwtConfig } from '../config/configuration';

/**
 * Mints and verifies tokens for BOTH realms, each with its own secret so a
 * token from one realm cannot be validated by the other.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private tenantCfg(): RealmJwtConfig {
    return this.config.getOrThrow<RealmJwtConfig>('tenantJwt');
  }

  private platformCfg(): RealmJwtConfig {
    return this.config.getOrThrow<RealmJwtConfig>('platformJwt');
  }

  // ---- Tenant realm ----

  async issueTenantTokens(params: {
    userId: string;
    tenantId: string;
    role: UserRole;
    impersonatedBy?: string;
    /** Override access-token TTL (used for short-lived impersonation tokens). */
    accessExpires?: string;
  }): Promise<AuthTokens> {
    const cfg = this.tenantCfg();
    const payload: TenantJwtPayload = {
      realm: Realm.TENANT,
      sub: params.userId,
      tenantId: params.tenantId,
      role: params.role,
      ...(params.impersonatedBy ? { impersonatedBy: params.impersonatedBy } : {}),
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: cfg.accessSecret,
      expiresIn: params.accessExpires ?? cfg.accessExpires,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: params.userId, tenantId: params.tenantId, realm: Realm.TENANT },
      { secret: cfg.refreshSecret, expiresIn: cfg.refreshExpires },
    );
    return { accessToken, refreshToken };
  }

  verifyTenantRefresh(token: string): Promise<{ sub: string; tenantId: string }> {
    return this.jwt.verifyAsync(token, { secret: this.tenantCfg().refreshSecret });
  }

  // ---- Platform realm ----

  async issuePlatformTokens(params: {
    platformUserId: string;
    superRole: SuperRole;
    twoFactor?: boolean;
  }): Promise<AuthTokens> {
    const cfg = this.platformCfg();
    const payload: PlatformJwtPayload = {
      realm: Realm.PLATFORM,
      sub: params.platformUserId,
      superRole: params.superRole,
      twoFactor: params.twoFactor ?? false,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: cfg.accessSecret,
      expiresIn: cfg.accessExpires,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: params.platformUserId, realm: Realm.PLATFORM },
      { secret: cfg.refreshSecret, expiresIn: cfg.refreshExpires },
    );
    return { accessToken, refreshToken };
  }

  verifyPlatformRefresh(token: string): Promise<{ sub: string }> {
    return this.jwt.verifyAsync(token, { secret: this.platformCfg().refreshSecret });
  }
}
