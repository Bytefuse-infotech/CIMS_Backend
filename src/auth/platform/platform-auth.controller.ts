import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@common/decorators/roles.decorator';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformLoginDto, RefreshDto } from '../dto/auth.dto';

/** Platform-surface auth. Mounted at /platform/v1/auth. */
@Controller('auth')
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: PlatformLoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @Public()
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }
}
