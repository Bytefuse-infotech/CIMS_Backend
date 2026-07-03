import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { bootTestApp, teardownTestApp, TestContext } from './utils/test-app';
import { TenantContextStore } from '../src/common/tenant-context';
import { InvoiceStatus, PaymentStatus } from '../src/shared/enums';
import { FeeInvoice, FeeInvoiceDocument } from '../src/modules/fees/schemas/fee-invoice.schema';
import { Payment, PaymentDocument } from '../src/modules/fees/schemas/payment.schema';
import { FeesService } from '../src/modules/fees/fees.service';

/**
 * Razorpay webhook idempotency: a duplicated (or retried) payment.captured
 * event must credit the invoice EXACTLY once. Proven by firing the same
 * webhook body twice and asserting amountPaid/status/payment-count don't move
 * on the second call.
 */
describe('Webhook idempotency', () => {
  let ctx: TestContext;
  let http: ReturnType<typeof request>;
  let invoiceModel: Model<FeeInvoiceDocument>;
  let paymentModel: Model<PaymentDocument>;
  let fees: FeesService;

  const TENANT = 'cccccccccccccccccccccccc';
  const STUDENT = new Types.ObjectId().toString();
  let invoiceId: string;
  let gatewayOrderId: string;

  beforeAll(async () => {
    ctx = await bootTestApp();
    http = request(ctx.app.getHttpServer());
    invoiceModel = ctx.app.get(getModelToken(FeeInvoice.name));
    paymentModel = ctx.app.get(getModelToken(Payment.name));
    fees = ctx.app.get(FeesService);

    // Seed an invoice + a payment order inside the tenant context.
    await TenantContextStore.run({ tenantId: TENANT }, async () => {
      const invoice = await invoiceModel.create({
        studentId: new Types.ObjectId(STUDENT),
        feePlanId: new Types.ObjectId(),
        label: 'Installment 1',
        amountDue: 1000,
        amountPaid: 0,
        dueDate: new Date('2999-01-01'),
        status: InvoiceStatus.PENDING,
      });
      invoiceId = invoice._id.toString();

      const order = await fees.createPaymentOrder(invoiceId);
      gatewayOrderId = order.gatewayOrderId;
    });
  });

  afterAll(() => teardownTestApp(ctx));

  const webhookBody = (paymentId: string) => ({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: gatewayOrderId,
          amount: 100000, // paisa → 1000 rupees
          signature: 'sig-stub',
        },
      },
    },
  });

  it('first webhook credits the invoice and marks it paid', async () => {
    const res = await http.post('/webhooks/razorpay').send(webhookBody('pay_ONE'));
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(true);

    const inv = await TenantContextStore.run({ tenantId: TENANT }, () =>
      invoiceModel.findById(invoiceId).exec(),
    );
    expect(inv?.amountPaid).toBe(1000);
    expect(inv?.status).toBe(InvoiceStatus.PAID);
  });

  it('a duplicate delivery of the SAME payment id does not double-credit', async () => {
    const res = await http.post('/webhooks/razorpay').send(webhookBody('pay_ONE'));
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false); // idempotent no-op

    const inv = await TenantContextStore.run({ tenantId: TENANT }, () =>
      invoiceModel.findById(invoiceId).exec(),
    );
    expect(inv?.amountPaid).toBe(1000); // unchanged, not 2000
    expect(inv?.status).toBe(InvoiceStatus.PAID);
  });

  it('records exactly one captured payment for the order', async () => {
    const captured = await TenantContextStore.run({ tenantId: TENANT }, () =>
      paymentModel
        .find({ gatewayOrderId, status: PaymentStatus.CAPTURED })
        .exec(),
    );
    expect(captured).toHaveLength(1);
    expect(captured[0].gatewayPaymentId).toBe('pay_ONE');
  });

  it('ignores non-capture events', async () => {
    const res = await http
      .post('/webhooks/razorpay')
      .send({ event: 'payment.failed', payload: { payment: { entity: { id: 'x', order_id: 'y', amount: 0 } } } });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
  });
});
