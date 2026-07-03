import { InvoiceStatus } from '@shared/enums';
import { applyPayment, computeInvoiceStatus, splitEqualInstallments } from './fee-calc';

describe('fee-calc', () => {
  describe('splitEqualInstallments', () => {
    it('splits evenly when divisible', () => {
      const out = splitEqualInstallments(3000, 3, new Date('2026-01-01'));
      expect(out.map((i) => i.amount)).toEqual([1000, 1000, 1000]);
    });

    it('never loses a paisa to rounding — sum equals total', () => {
      const total = 1000; // /3 = 333.33...
      const out = splitEqualInstallments(total, 3, new Date('2026-01-01'));
      const sum = out.reduce((a, i) => a + i.amount, 0);
      expect(Math.round(sum * 100)).toBe(Math.round(total * 100));
      // Remainder goes to the earliest installments.
      expect(out.map((i) => i.amount)).toEqual([333.34, 333.33, 333.33]);
    });

    it('spaces due dates by the interval', () => {
      const out = splitEqualInstallments(200, 2, new Date('2026-01-01'), 30);
      expect(out[0].dueDate.toISOString().slice(0, 10)).toBe('2026-01-01');
      expect(out[1].dueDate.toISOString().slice(0, 10)).toBe('2026-01-31');
    });

    it('handles a single installment', () => {
      const out = splitEqualInstallments(500, 1, new Date('2026-01-01'));
      expect(out).toHaveLength(1);
      expect(out[0].amount).toBe(500);
    });

    it('rejects invalid input', () => {
      expect(() => splitEqualInstallments(100, 0, new Date())).toThrow();
      expect(() => splitEqualInstallments(-1, 1, new Date())).toThrow();
    });
  });

  describe('computeInvoiceStatus', () => {
    const future = new Date('2999-01-01');
    const past = new Date('2000-01-01');

    it('PENDING when unpaid and not yet due', () => {
      expect(computeInvoiceStatus(1000, 0, future)).toBe(InvoiceStatus.PENDING);
    });

    it('OVERDUE when unpaid and past due', () => {
      expect(computeInvoiceStatus(1000, 0, past)).toBe(InvoiceStatus.OVERDUE);
    });

    it('PARTIAL when partly paid', () => {
      expect(computeInvoiceStatus(1000, 400, future)).toBe(InvoiceStatus.PARTIAL);
      // partial takes precedence over overdue
      expect(computeInvoiceStatus(1000, 400, past)).toBe(InvoiceStatus.PARTIAL);
    });

    it('PAID when fully paid', () => {
      expect(computeInvoiceStatus(1000, 1000, future)).toBe(InvoiceStatus.PAID);
      expect(computeInvoiceStatus(1000, 1200, past)).toBe(InvoiceStatus.PAID);
    });
  });

  describe('applyPayment', () => {
    it('adds a payment', () => {
      expect(applyPayment(1000, 200, 300)).toBe(500);
    });

    it('clamps so paid never exceeds due', () => {
      expect(applyPayment(1000, 800, 500)).toBe(1000);
    });

    it('rejects negative payment', () => {
      expect(() => applyPayment(1000, 0, -1)).toThrow();
    });
  });
});
