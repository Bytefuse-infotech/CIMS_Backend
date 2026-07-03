import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public, Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TenantPrincipal } from '@shared/auth.types';
import { UserRole } from '@shared/enums';
import { TenantAuthGuard } from './tenant-auth.guard';
import { TenantAuthService } from './tenant-auth.service';
import {
  AcceptInviteDto,
  FcmTokenDto,
  InviteUserDto,
  RefreshDto,
  TenantLoginDto,
} from '../dto/auth.dto';

/** Tenant-surface auth. Mounted at /api/v1/auth. */
@Controller('auth')
@UseGuards(TenantAuthGuard)
export class TenantAuthController {
  constructor(private readonly auth: TenantAuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: TenantLoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @Public()
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post('accept-invite')
  @Public()
  acceptInvite(@Body() body: AcceptInviteDto & { subdomain: string }) {
    return this.auth.acceptInvite(body.subdomain, body);
  }

  /** Admin-only: invite a user into the current tenant. */
  @Post('invite')
  @Roles(UserRole.ADMIN)
  invite(@Body() dto: InviteUserDto) {
    return this.auth.invite(dto);
  }

  /** Register the caller's device push token. */
  @Post('fcm-token')
  fcmToken(@CurrentUser() user: TenantPrincipal, @Body() dto: FcmTokenDto) {
    return this.auth.addFcmToken(user.userId, dto.token);
  }
}
