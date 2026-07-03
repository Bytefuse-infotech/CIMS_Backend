import { Body, Controller, Post, HttpCode, Req, Headers } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request } from 'express';
import { Public } from '@common/decorators/roles.decorator';
import { TenantContextStore } from '@common/tenant-context';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { FeesService } from './fees.service';
import { RazorpayGateway } from './razorpay.gateway';

interface RazorpayWebhookBody {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string; // gatewayPaymentId
        order_id: string; // gatewayOrderId
        amount: number; // in paisa
        signature?: string;
      };
    };
  };
}

/**
 * Gateway webhooks. Public (no user JWT) — authenticity comes from signature
 * verification (deferred: real HMAC check against the Razorpay secret goes here).
 *
 * Mounted OUTSIDE the versioned surfaces at /webhooks so the gateway hits a
 * stable path. The webhook resolves which tenant a payment belongs to via the
 * Payment record (gatewayOrderId is globally unique), then applies the capture
 * inside that tenant's context. Idempotent: duplicate deliveries are no-ops.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly fees: FeesService,
    private readonly gateway: RazorpayGateway,
  ) {}

  @Post('razorpay')
  @Public()
  @HttpCode(200)
  async razorpay(
    @Body() body: RazorpayWebhookBody,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature?: string,
  ): Promise<{ received: true; applied: boolean }> {
    // Verify authenticity. When a webhook secret is configured this enforces the
    // HMAC over the raw body; in stub mode (no secret) it passes so dev works.
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    if (!this.gateway.verifyWebhookSignature(raw, signature)) {
      return { received: true, applied: false };
    }

    if (body?.event !== 'payment.captured') {
      return { received: true, applied: false };
    }
    const entity = body.payload?.payment?.entity;
    if (!entity?.order_id || !entity?.id) {
      return { received: true, applied: false };
    }

    // Resolve the tenant owning this order. Payment is tenant-scoped, and the
    // webhook has no tenant context, so read it under a system bypass.
    const payment = await TenantContextStore.runWithBypass('system:webhook', () =>
      this.paymentModel.findOne({ gatewayOrderId: entity.order_id }).select('tenantId').exec(),
    );
    if (!payment) {
      return { received: true, applied: false };
    }

    // Apply within the owning tenant's context so all writes stay scoped.
    const result = await TenantContextStore.run({ tenantId: payment.tenantId }, () =>
      this.fees.applyCapturedPayment({
        gatewayOrderId: entity.order_id,
        gatewayPaymentId: entity.id,
        gatewaySignature: entity.signature,
        amount: entity.amount / 100, // paisa → rupees
      }),
    );

    return { received: true, applied: result.applied };
  }
}
