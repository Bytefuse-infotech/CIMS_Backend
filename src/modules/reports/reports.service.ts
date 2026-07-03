import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceStatus, InvoiceStatus } from '@shared/enums';
import { FeeInvoice, FeeInvoiceDocument } from '../fees/schemas/fee-invoice.schema';
import { Attendance, AttendanceDocument } from '../attendance/attendance.schema';
import { TestScore, TestScoreDocument } from '../academics/schemas/test-score.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(FeeInvoice.name) private readonly invoiceModel: Model<FeeInvoiceDocument>,
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(TestScore.name) private readonly scoreModel: Model<TestScoreDocument>,
  ) {}

  /** Totals of billed / collected / outstanding, plus a status breakdown. */
  async feesSummary(): Promise<{
    billed: number;
    collected: number;
    outstanding: number;
    byStatus: Record<string, number>;
  }> {
    const rows = await this.invoiceModel.aggregate<{
      _id: InvoiceStatus;
      due: number;
      paid: number;
      count: number;
    }>([
      {
        $group: {
          _id: '$status',
          due: { $sum: '$amountDue' },
          paid: { $sum: '$amountPaid' },
          count: { $sum: 1 },
        },
      },
    ]);

    let billed = 0;
    let collected = 0;
    const byStatus: Record<string, number> = {};
    for (const r of rows) {
      billed += r.due;
      collected += r.paid;
      byStatus[r._id] = r.count;
    }
    return { billed, collected, outstanding: billed - collected, byStatus };
  }

  /** Attendance rate per student (present+late over total). */
  async attendanceSummary(): Promise<
    Array<{ studentId: string; present: number; total: number; rate: number }>
  > {
    const rows = await this.attendanceModel.aggregate<{
      _id: string;
      present: number;
      total: number;
    }>([
      {
        $group: {
          _id: '$studentId',
          present: {
            $sum: {
              $cond: [
                { $in: ['$status', [AttendanceStatus.PRESENT, AttendanceStatus.LATE]] },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
    ]);
    return rows.map((r) => ({
      studentId: r._id.toString(),
      present: r.present,
      total: r.total,
      rate: r.total ? Math.round((r.present / r.total) * 100) / 100 : 0,
    }));
  }

  /** Average marks per student across tests. */
  async performanceSummary(): Promise<
    Array<{ studentId: string; avgMarks: number; tests: number }>
  > {
    const rows = await this.scoreModel.aggregate<{
      _id: string;
      avg: number;
      count: number;
    }>([
      {
        $group: {
          _id: '$studentId',
          avg: { $avg: '$marks' },
          count: { $sum: 1 },
        },
      },
    ]);
    return rows.map((r) => ({
      studentId: r._id.toString(),
      avgMarks: Math.round(r.avg * 100) / 100,
      tests: r.count,
    }));
  }
}
