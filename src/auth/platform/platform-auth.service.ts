import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthTokens } from '@shared/auth.types';
import {
  PlatformUser,
  PlatformUserDocument,
} from '../../modules/platform-users/platform-user.schema';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
import { PlatformLoginDto, RefreshDto } from '../dto/auth.dto';

@Injectable()
export class PlatformAuthService {
  constructor(
    @InjectModel(PlatformUser.name)
    private readonly platformUserModel: Model<PlatformUserDocument>,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login(dto: PlatformLoginDto): Promise<AuthTokens> {
    const user = await this.platformUserModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+passwordHash +twoFactorSecret')
      .exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await this.passwords.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // 2FA reserved: if a secret is set we would verify dto.totp here. Deferred.
    return this.tokens.issuePlatformTokens({
      platformUserId: user._id.toString(),
      superRole: user.superRole,
      twoFactor: !!user.twoFactorSecret,
    });
  }

  async refresh(dto: RefreshDto): Promise<AuthTokens> {
    let claims: { sub: string };
    try {
      claims = await this.tokens.verifyPlatformRefresh(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.platformUserModel.findById(claims.sub);
    if (!user) {
      throw new UnauthorizedException('Platform user no longer exists');
    }
    return this.tokens.issuePlatformTokens({
      platformUserId: user._id.toString(),
      superRole: user.superRole,
    });
  }
}
