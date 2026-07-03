import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/platform/platform-auth.guard';
import { BillingService } from './billing.service';

/** Platform surface — mounted at /platform/v1. */
@Controller()
@UseGuards(PlatformAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscriptions')
  subscriptions() {
    return this.billing.listSubscriptions();
  }

  @Get('billing/mrr')
  mrr() {
    return this.billing.mrr();
  }
}
