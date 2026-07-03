import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../modules/users/user.schema';
import { Tenant, TenantSchema } from '../modules/tenants/tenant.schema';
import { PlatformUser, PlatformUserSchema } from '../modules/platform-users/platform-user.schema';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TenantJwtStrategy } from './tenant/tenant-jwt.strategy';
import { PlatformJwtStrategy } from './platform/platform-jwt.strategy';
import { TenantAuthService } from './tenant/tenant-auth.service';
import { PlatformAuthService } from './platform/platform-auth.service';

/**
 * Both auth realms' shared plumbing: password hashing, token minting, passport
 * strategies, and the two auth services. The CONTROLLERS live in the surface
 * modules (tenant-api / platform-api) so they inherit the correct route prefix.
 *
 * Exports TokenService + PasswordService + the two services so other modules
 * (impersonation, provisioning that seeds an admin) can reuse them. The
 * strategies register the 'tenant-jwt' / 'platform-jwt' passport names used by
 * the guards across the app.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets passed per-sign/verify, not globally
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: PlatformUser.name, schema: PlatformUserSchema },
    ]),
  ],
  providers: [
    PasswordService,
    TokenService,
    TenantJwtStrategy,
    PlatformJwtStrategy,
    TenantAuthService,
    PlatformAuthService,
  ],
  exports: [PasswordService, TokenService, TenantAuthService, PlatformAuthService],
})
export class AuthModule {}
