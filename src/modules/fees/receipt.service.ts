import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { StorageService } from '../materials/storage.service';

export interface ReceiptData {
  invoiceLabel: string;
  amount: number;
  paidAt: Date;
  paymentId: string;
  tenantId: string;
  studentId: string;
}

/**
 * Generates a PDF receipt and stores it via the storage seam, returning the URL.
 * If storage is not configured, returns undefined (receipt generation is
 * best-effort and must never break payment capture).
 */
@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(private readonly storage: StorageService) {}

  async generate(data: ReceiptData): Promise<string | undefined> {
    try {
      const pdf = await this.renderPdf(data);
      const key = `receipts/${data.tenantId}/${data.paymentId}.pdf`;
      return await this.storage.putObject(key, pdf, 'application/pdf');
    } catch (err) {
      this.logger.error(
        `Receipt generation failed for payment ${data.paymentId}`,
        err instanceof Error ? err.stack : String(err),
      );
      return undefined;
    }
  }

  private renderPdf(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Payment Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Receipt for: ${data.invoiceLabel}`);
      doc.text(`Amount paid: INR ${data.amount.toLocaleString('en-IN')}`);
      doc.text(`Paid on: ${data.paidAt.toLocaleString('en-IN')}`);
      doc.text(`Payment ID: ${data.paymentId}`);
      doc.moveDown();
      doc.fontSize(9).fillColor('#666').text('This is a system-generated receipt.');
      doc.end();
    });
  }
}
