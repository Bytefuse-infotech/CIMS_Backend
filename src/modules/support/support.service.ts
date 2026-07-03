import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { TenantStatus, UserRole } from '@shared/enums';
import { AuthTokens } from '@shared/auth.types';
import { TenantContextStore } from '@common/tenant-context';
import { AuditService } from '@common/audit/audit.service';
import { TokenService } from '../../auth/token.service';
import { Tenant, TenantDocument } from '../tenants/tenant.schema';
import { User, UserDocument } from '../users/user.schema';

/**
 * Support impersonation. Mints a SHORT-LIVED tenant token scoped to one tenant,
 * stamped with `impersonatedBy`, and audits it. Never a standing session.
 */
@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async impersonate(actor: string, tenantId: string): Promise<AuthTokens> {
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      throw new NotFoundException('Active tenant not found');
    }

    // Pick an admin of that tenant to impersonate (read via audited bypass).
    const admin = await TenantContextStore.runWithBypass(actor, () =>
      this.userModel.findOne({ tenantId, role: UserRole.ADMIN }).exec(),
    );
    if (!admin) {
      throw new NotFoundException('No admin user to impersonate for this tenant');
    }

    const accessExpires = this.config.get<string>('impersonationExpires') ?? '10m';
    const issued = await this.tokens.issueTenantTokens({
      userId: admin._id.toString(),
      tenantId,
      role: UserRole.ADMIN,
      impersonatedBy: actor,
      accessExpires,
    });

    await this.audit.record({
      actor,
      action: 'impersonate',
      targetTenantId: tenantId,
      meta: { impersonatedUserId: admin._id.toString(), accessExpires },
    });

    // Refresh token is not returned for impersonation — sessions must not persist.
    return { accessToken: issued.accessToken, refreshToken: '' };
  }
}
