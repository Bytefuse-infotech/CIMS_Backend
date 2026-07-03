import { Realm, SuperRole, UserRole } from './enums';

/**
 * JWT payloads for the two realms. The `realm` discriminator is the structural
 * guarantee a guard checks — a platform token can never satisfy a tenant guard
 * and vice versa, even if both were signed with the same algorithm.
 */

export interface TenantJwtPayload {
  realm: Realm.TENANT;
  sub: string; // userId
  tenantId: string;
  role: UserRole;
  /** Set when this token was minted via platform impersonation. Audited. */
  impersonatedBy?: string; // platformUserId
}

export interface PlatformJwtPayload {
  realm: Realm.PLATFORM;
  sub: string; // platformUserId
  superRole: SuperRole;
  /** true only after 2FA is satisfied (2FA itself deferred, flag reserved). */
  twoFactor?: boolean;
}

export type AnyJwtPayload = TenantJwtPayload | PlatformJwtPayload;

/** Request-attached principals after a guard validates the token. */
export interface TenantPrincipal {
  userId: string;
  tenantId: string;
  role: UserRole;
  impersonatedBy?: string;
}

export interface PlatformPrincipal {
  platformUserId: string;
  superRole: SuperRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
