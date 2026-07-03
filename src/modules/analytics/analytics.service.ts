import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantStatus } from '@shared/enums';
import { TenantContextStore } from '@common/tenant-context';
import { Tenant, TenantDocument } from '../tenants/tenant.schema';
import { User, UserDocument } from '../users/user.schema';

export interface AnalyticsOverview {
  tenants: { total: number; active: number; suspended: number };
  usage: { totalUsers: number };
}

/**
 * Cross-tenant analytics for the platform owner. User counts span all tenants,
 * so the query runs under an audited bypass keyed to the requesting owner.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async overview(actor: string): Promise<AnalyticsOverview> {
    const [total, active, suspended] = await Promise.all([
      this.tenantModel.countDocuments(),
      this.tenantModel.countDocuments({ status: TenantStatus.ACTIVE }),
      this.tenantModel.countDocuments({ status: TenantStatus.SUSPENDED }),
    ]);

    const totalUsers = await TenantContextStore.runWithBypass(actor, () =>
      this.userModel.countDocuments().exec(),
    );

    return {
      tenants: { total, active, suspended },
      usage: { totalUsers },
    };
  }
}
