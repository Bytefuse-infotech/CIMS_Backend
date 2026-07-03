import { InvoiceStatus } from '@shared/enums';

/**
 * Pure fee-calculation helpers. No I/O — unit-tested directly.
 */

export interface InstallmentInput {
  label: string;
  amount: number;
  dueDate: Date;
}

/**
 * Split a total into N equal installments, distributing rounding remainder to
 * the earliest installments so the sum EXACTLY equals the total (money must
 * never lose or gain a paisa to rounding).
 */
export function splitEqualInstallments(
  total: number,
  count: number,
  firstDueDate: Date,
  intervalDays = 30,
): InstallmentInput[] {
  if (count < 1) throw new Error('installment count must be >= 1');
  if (total < 0) throw new Error('total must be >= 0');

  // Work in integer paisa to avoid float drift.
  const totalPaisa = Math.round(total * 100);
  const base = Math.floor(totalPaisa / count);
  const remainder = totalPaisa - base * count;

  const out: InstallmentInput[] = [];
  for (let i = 0; i < count; i++) {
    const paisa = base + (i < remainder ? 1 : 0);
    const dueDate = new Date(firstDueDate);
    dueDate.setDate(dueDate.getDate() + i * intervalDays);
    out.push({
      label: `Installment ${i + 1}`,
      amount: paisa / 100,
      dueDate,
    });
  }
  return out;
}

/**
 * Derive an invoice's status from amounts + due date. Central so status is
 * always computed the same way (create, payment applied, reminder job).
 */
export function computeInvoiceStatus(
  amountDue: number,
  amountPaid: number,
  dueDate: Date,
  now: Date = new Date(),
): InvoiceStatus {
  if (amountPaid >= amountDue && amountDue > 0) return InvoiceStatus.PAID;
  if (amountPaid > 0 && amountPaid < amountDue) return InvoiceStatus.PARTIAL;
  // Nothing paid yet.
  if (dueDate < now) return InvoiceStatus.OVERDUE;
  return InvoiceStatus.PENDING;
}

/** Apply a payment to an invoice's paid amount, clamped so it never overshoots. */
export function applyPayment(amountDue: number, amountPaid: number, payment: number): number {
  if (payment < 0) throw new Error('payment must be >= 0');
  return Math.min(amountDue, Math.round((amountPaid + payment) * 100) / 100);
}
