import { Module } from '@nestjs/common';
import { FeesModule } from './fees.module';
import { WebhooksController } from './webhooks.controller';

/**
 * Public webhook surface, mounted at the app root (/webhooks) — outside both
 * versioned surfaces and outside the tenant guard. Authenticity comes from
 * signature verification (deferred). Reuses FeesService via FeesModule.
 */
@Module({
  imports: [FeesModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
