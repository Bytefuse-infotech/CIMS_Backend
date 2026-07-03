import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayGateway } from './razorpay.gateway';
import { RazorpayConfig } from '../../config/configuration';

function gatewayWith(cfg: Partial<RazorpayConfig>): RazorpayGateway {
  const full: RazorpayConfig = {
    keyId: undefined,
    keySecret: undefined,
    webhookSecret: undefined,
    enabled: false,
    ...cfg,
  };
  const config = { getOrThrow: () => full } as unknown as ConfigService;
  return new RazorpayGateway(config);
}

describe('RazorpayGateway.verifyWebhookSignature', () => {
  const secret = 'whsec_test';
  const body = '{"event":"payment.captured"}';
  const validSig = createHmac('sha256', secret).update(body).digest('hex');

  it('passes in stub mode (no webhook secret configured)', () => {
    const gw = gatewayWith({});
    expect(gw.verifyWebhookSignature(body, undefined)).toBe(true);
  });

  it('accepts a correct HMAC when a secret is set', () => {
    const gw = gatewayWith({ webhookSecret: secret });
    expect(gw.verifyWebhookSignature(body, validSig)).toBe(true);
  });

  it('rejects a wrong signature when a secret is set', () => {
    const gw = gatewayWith({ webhookSecret: secret });
    expect(gw.verifyWebhookSignature(body, 'deadbeef')).toBe(false);
  });

  it('rejects a missing signature when a secret is set', () => {
    const gw = gatewayWith({ webhookSecret: secret });
    expect(gw.verifyWebhookSignature(body, undefined)).toBe(false);
  });

  it('rejects when the body is tampered', () => {
    const gw = gatewayWith({ webhookSecret: secret });
    expect(gw.verifyWebhookSignature('{"event":"tampered"}', validSig)).toBe(false);
  });

  it('stub order id is deterministic from the receipt', async () => {
    const gw = gatewayWith({});
    const order = await gw.createOrder({ amount: 1000, receipt: 'inv1_0' });
    expect(order.gatewayOrderId).toBe('order_stub_inv1_0');
    expect(order.amount).toBe(1000);
  });
});
