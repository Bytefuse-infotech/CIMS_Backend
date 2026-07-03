import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';
import { RazorpayConfig } from '../../config/configuration';

export interface GatewayOrder {
  gatewayOrderId: string;
  amount: number;
  currency: string;
}

/**
 * Wraps Razorpay. Env-gated: when RAZORPAY_KEY_ID/SECRET are set it uses the
 * real SDK; otherwise it degrades to a deterministic stub so local/dev and the
 * test suite work with no keys. Webhook signature verification uses the real
 * HMAC when a webhook secret is configured.
 */
@Injectable()
export class RazorpayGateway {
  private readonly logger = new Logger(RazorpayGateway.name);
  private readonly cfg: RazorpayConfig;
  private client: Razorpay | null = null;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<RazorpayConfig>('razorpay');
    if (this.cfg.enabled) {
      this.client = new Razorpay({ key_id: this.cfg.keyId!, key_secret: this.cfg.keySecret! });
      this.logger.log('Razorpay gateway enabled (live SDK).');
    } else {
      this.logger.warn('Razorpay keys not set — using stub gateway.');
    }
  }

  get enabled(): boolean {
    return this.cfg.enabled;
  }

  /** Create a gateway order. `amount` is in rupees; Razorpay wants paisa. */
  async createOrder(params: {
    amount: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<GatewayOrder> {
    const amountPaisa = Math.round(params.amount * 100);
    if (this.client) {
      const order = await this.client.orders.create({
        amount: amountPaisa,
        currency: 'INR',
        receipt: params.receipt,
        notes: params.notes,
      });
      return {
        gatewayOrderId: order.id,
        amount: Number(order.amount) / 100,
        currency: order.currency,
      };
    }
    // Stub: deterministic order id derived from the receipt.
    return {
      gatewayOrderId: `order_stub_${params.receipt}`,
      amount: params.amount,
      currency: 'INR',
    };
  }

  /**
   * Verify a webhook payload's authenticity. Returns true when no webhook secret
   * is configured (stub mode) so local testing works; when a secret IS set, the
   * HMAC must match.
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    if (!this.cfg.webhookSecret) return true; // stub mode
    if (!signature) return false;
    const expected = createHmac('sha256', this.cfg.webhookSecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
