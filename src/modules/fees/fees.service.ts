import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InvoiceStatus, PaymentStatus } from '@shared/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { Student, StudentDocument } from '../students/student.schema';
import { FeePlan, FeePlanDocument } from './schemas/fee-plan.schema';
import { FeeInvoice, FeeInvoiceDocument } from './schemas/fee-invoice.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { applyPayment, computeInvoiceStatus, splitEqualInstallments } from './fee-calc';
import { CreateFeePlanDto, GenerateInvoicesDto } from './dto/fee.dto';

@Injectable()
export class FeesService {
  constructor(
    @InjectModel(FeePlan.name) private readonly planModel: Model<FeePlanDocument>,
    @InjectModel(FeeInvoice.name) private readonly invoiceModel: Model<FeeInvoiceDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    private readonly notifications: NotificationsService,
  ) {}

  // ---- Fee plans ----

  listPlans(): Promise<FeePlan[]> {
    return this.planModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async createPlan(dto: CreateFeePlanDto): Promise<FeePlan> {
    let installments = dto.installments?.map((i) => ({ ...i, dueDate: new Date(i.dueDate) }));

    if (!installments?.length && dto.splitInto) {
      const first = dto.firstDueDate ? new Date(dto.firstDueDate) : new Date();
      installments = splitEqualInstallments(dto.totalAmount, dto.splitInto, first);
    }
    if (!installments?.length) {
      throw new BadRequestException('Provide installments or splitInto');
    }

    const sum = installments.reduce((a, i) => a + i.amount, 0);
    if (Math.round(sum * 100) !== Math.round(dto.totalAmount * 100)) {
      throw new BadRequestException(
        `Installments (${sum}) must sum to totalAmount (${dto.totalAmount})`,
      );
    }

    return this.planModel.create({
      name: dto.name,
      totalAmount: dto.totalAmount,
      batchId: dto.batchId,
      installments,
    });
  }

  // ---- Invoice generation ----

  /**
   * Generate one invoice per (student × installment) for a fee plan. Idempotent
   * per (student, plan, label): a re-run won't duplicate.
   */
  async generateInvoices(planId: string, dto: GenerateInvoicesDto): Promise<{ created: number }> {
    const plan = await this.planModel.findById(planId);
    if (!plan) throw new NotFoundException('Fee plan not found');
    if (!plan.installments.length) {
      throw new BadRequestException('Fee plan has no installments');
    }

    let studentIds = dto.studentIds;
    if (!studentIds?.length) {
      if (!plan.batchId) {
        throw new BadRequestException('Plan has no batch; provide studentIds');
      }
      const students = await this.studentModel
        .find({ batchIds: plan.batchId })
        .select('_id')
        .lean()
        .exec();
      studentIds = students.map((s) => s._id.toString());
    }

    let created = 0;
    for (const studentId of studentIds) {
      for (const inst of plan.installments) {
        const status = computeInvoiceStatus(inst.amount, 0, inst.dueDate);
        const res = await this.invoiceModel.updateOne(
          {
            studentId: new Types.ObjectId(studentId),
            feePlanId: plan._id,
            label: inst.label,
          },
          {
            $setOnInsert: {
              studentId: new Types.ObjectId(studentId),
              feePlanId: plan._id,
              label: inst.label,
              amountDue: inst.amount,
              amountPaid: 0,
              dueDate: inst.dueDate,
              status,
            },
          },
          { upsert: true },
        );
        if (res.upsertedCount) created++;
      }
    }
    return { created };
  }

  // ---- Invoices ----

  listInvoices(filter: { studentId?: string; status?: InvoiceStatus }): Promise<FeeInvoice[]> {
    const q: Record<string, unknown> = {};
    if (filter.studentId) q.studentId = new Types.ObjectId(filter.studentId);
    if (filter.status) q.status = filter.status;
    return this.invoiceModel.find(q).sort({ dueDate: 1 }).lean().exec();
  }

  async getInvoice(id: string): Promise<FeeInvoiceDocument> {
    const inv = await this.invoiceModel.findById(id);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  // ---- Payments ----

  /**
   * Create a payment order for an invoice. Real gateway order creation is
   * deferred; we persist a Payment in `created` state and return a stub order.
   */
  async createPaymentOrder(invoiceId: string): Promise<{
    paymentId: string;
    gatewayOrderId: string;
    amount: number;
  }> {
    const invoice = await this.getInvoice(invoiceId);
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice already paid');
    }
    const amount = invoice.amountDue - invoice.amountPaid;
    // Stub order id — the real Razorpay order id replaces this when integrated.
    const gatewayOrderId = `order_stub_${invoice._id.toString()}_${invoice.amountPaid}`;

    const payment = await this.paymentModel.create({
      invoiceId: invoice._id,
      studentId: invoice.studentId,
      amount,
      gatewayOrderId,
      status: PaymentStatus.CREATED,
    });
    return { paymentId: payment._id.toString(), gatewayOrderId, amount };
  }

  /**
   * Apply a captured gateway payment. IDEMPOTENT: keyed on gatewayPaymentId's
   * unique index — a duplicate webhook for the same gatewayPaymentId is a no-op
   * and never double-credits the invoice.
   *
   * Returns whether this call actually applied the payment (false = duplicate).
   */
  async applyCapturedPayment(params: {
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature?: string;
    amount: number;
  }): Promise<{ applied: boolean; invoiceId?: string }> {
    // If we've already recorded this gatewayPaymentId, it's a retry — no-op.
    const existing = await this.paymentModel.findOne({
      gatewayPaymentId: params.gatewayPaymentId,
    });
    if (existing) {
      return { applied: false, invoiceId: existing.invoiceId.toString() };
    }

    // Find the pending payment for this order.
    const payment = await this.paymentModel.findOne({
      gatewayOrderId: params.gatewayOrderId,
      status: PaymentStatus.CREATED,
    });
    if (!payment) {
      // No matching created order — nothing to apply (still idempotent-safe).
      return { applied: false };
    }

    // Claim it by writing the unique gatewayPaymentId. If a concurrent duplicate
    // webhook races us, the unique index makes exactly one win.
    try {
      payment.gatewayPaymentId = params.gatewayPaymentId;
      payment.gatewaySignature = params.gatewaySignature;
      payment.status = PaymentStatus.CAPTURED;
      payment.paidAt = new Date();
      await payment.save();
    } catch (err: unknown) {
      // Duplicate key → another delivery already captured this payment.
      if (isDuplicateKeyError(err)) {
        return { applied: false, invoiceId: payment.invoiceId.toString() };
      }
      throw err;
    }

    // Apply to the invoice.
    const invoice = await this.invoiceModel.findById(payment.invoiceId);
    if (invoice) {
      invoice.amountPaid = applyPayment(invoice.amountDue, invoice.amountPaid, params.amount);
      invoice.status = computeInvoiceStatus(invoice.amountDue, invoice.amountPaid, invoice.dueDate);
      await invoice.save();

      // Notify the student that payment is confirmed.
      await this.notifications.notify({
        userId: invoice.studentId,
        type: 'invoice_paid',
        title: 'Payment received',
        body: `We received your payment for "${invoice.label}".`,
        data: { invoiceId: invoice._id.toString() },
      });
    }

    return { applied: true, invoiceId: payment.invoiceId.toString() };
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}
