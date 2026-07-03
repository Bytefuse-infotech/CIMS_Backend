import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { TenantStatus, UserStatus } from '@shared/enums';
import { AuthTokens } from '@shared/auth.types';
import { TenantContextStore } from '@common/tenant-context';
import { User, UserDocument } from '../../modules/users/user.schema';
import { Tenant, TenantDocument } from '../../modules/tenants/tenant.schema';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
import { AcceptInviteDto, InviteUserDto, RefreshDto, TenantLoginDto } from '../dto/auth.dto';

@Injectable()
export class TenantAuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  /** Resolve the institute by subdomain, then authenticate the user within it. */
  async login(dto: TenantLoginDto): Promise<AuthTokens> {
    const tenant = await this.tenantModel.findOne({ subdomain: dto.subdomain.toLowerCase() });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
      // Same error whether tenant missing or suspended — don't leak which.
      throw new UnauthorizedException('Invalid credentials');
    }
    const tenantId = tenant._id.toString();

    const user = await TenantContextStore.run({ tenantId }, () =>
      this.userModel.findOne({ email: dto.email.toLowerCase() }).select('+passwordHash').exec(),
    );
    if (!user || !user.passwordHash || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await this.passwords.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.tokens.issueTenantTokens({
      userId: user._id.toString(),
      tenantId,
      role: user.role,
    });
  }

  async refresh(dto: RefreshDto): Promise<AuthTokens> {
    let claims: { sub: string; tenantId: string };
    try {
      claims = await this.tokens.verifyTenantRefresh(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await TenantContextStore.run({ tenantId: claims.tenantId }, () =>
      this.userModel.findById(claims.sub).exec(),
    );
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User no longer active');
    }
    return this.tokens.issueTenantTokens({
      userId: user._id.toString(),
      tenantId: claims.tenantId,
      role: user.role,
    });
  }

  /**
   * Admin invites a user. Runs inside the caller's tenant context (set by the
   * request interceptor), so the created user is scoped automatically.
   * Returns the raw invite token for delivery (email integration deferred).
   */
  async invite(dto: InviteUserDto): Promise<{ userId: string; inviteToken: string }> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }
    const inviteToken = randomBytes(24).toString('hex');
    const inviteTokenHash = createHash('sha256').update(inviteToken).digest('hex');

    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      role: dto.role,
      phone: dto.phone,
      status: UserStatus.INVITED,
      inviteTokenHash,
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return { userId: user._id.toString(), inviteToken };
  }

  /** Invitee sets their password. Requires knowing the tenant (subdomain). */
  async acceptInvite(subdomain: string, dto: AcceptInviteDto): Promise<AuthTokens> {
    const tenant = await this.tenantModel.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      throw new NotFoundException('Institute not found');
    }
    const tenantId = tenant._id.toString();
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    return TenantContextStore.run({ tenantId }, async () => {
      const user = await this.userModel
        .findOne({ inviteTokenHash: tokenHash })
        .select('+inviteTokenHash')
        .exec();
      if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired invite');
      }
      user.passwordHash = await this.passwords.hash(dto.password);
      user.status = UserStatus.ACTIVE;
      user.inviteTokenHash = undefined;
      user.inviteExpiresAt = undefined;
      await user.save();
      return this.tokens.issueTenantTokens({
        userId: user._id.toString(),
        tenantId,
        role: user.role,
      });
    });
  }

  /** Register a device's FCM token for the current user. */
  async addFcmToken(userId: string, token: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $addToSet: { fcmTokens: token } });
  }
}
