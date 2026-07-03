import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PlatformAuthController } from '../auth/platform/platform-auth.controller';

import { Tenant, TenantSchema } from '../modules/tenants/tenant.schema';
import { User, UserSchema } from '../modules/users/user.schema';
import { Plan, PlanSchema } from '../modules/plans/plan.schema';
import { Subscription, SubscriptionSchema } from '../modules/billing/subscription.schema';

import { TenantsService } from '../modules/tenants/tenants.service';
import { TenantsController } from '../modules/tenants/tenants.controller';
import { PlansService } from '../modules/plans/plans.service';
import { PlansController } from '../modules/plans/plans.controller';
import { BillingService } from '../modules/billing/billing.service';
import { BillingController } from '../modules/billing/billing.controller';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { AnalyticsController } from '../modules/analytics/analytics.controller';
import { SupportService } from '../modules/support/support.service';
import { SupportController } from '../modules/support/support.controller';

/**
 * Platform surface — everything mounted under /platform/v1. Cross-tenant,
 * super-admin only. All controllers apply PlatformAuthGuard (except the two
 * @Public auth routes). Cross-tenant reads/writes go through the audited
 * tenant-scope bypass.
 */
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    RouterModule.register([{ path: 'platform/v1', module: PlatformApiModule }]),
  ],
  controllers: [
    PlatformAuthController,
    TenantsController,
    PlansController,
    BillingController,
    AnalyticsController,
    SupportController,
  ],
  providers: [TenantsService, PlansService, BillingService, AnalyticsService, SupportService],
})
export class PlatformApiModule {}
