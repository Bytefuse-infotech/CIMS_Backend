import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AttendanceSource, AttendanceStatus } from '@shared/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { Student, StudentDocument } from '../students/student.schema';
import { Attendance, AttendanceDocument } from './attendance.schema';
import { MarkAttendanceDto, QueryAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly model: Model<AttendanceDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Upsert attendance for a batch on a date; notify a parent on absence. */
  async mark(
    markedBy: string,
    dto: MarkAttendanceDto,
  ): Promise<{ marked: number; absencesNotified: number }> {
    const date = normalizeDate(new Date(dto.date));
    const batchId = new Types.ObjectId(dto.batchId);
    let absencesNotified = 0;

    for (const entry of dto.entries) {
      const studentId = new Types.ObjectId(entry.studentId);
      await this.model.updateOne(
        { studentId, batchId, date },
        {
          $set: {
            status: entry.status,
            markedBy: new Types.ObjectId(markedBy),
            source: AttendanceSource.MANUAL,
          },
        },
        { upsert: true },
      );

      if (entry.status === AttendanceStatus.ABSENT) {
        const student = await this.studentModel.findById(studentId).lean().exec();
        const notifyUser = student?.parentUserId ?? student?.userId;
        if (notifyUser) {
          await this.notifications.notify({
            userId: notifyUser,
            type: 'absence',
            title: 'Absence recorded',
            body: `Your ward was marked absent on ${date.toDateString()}.`,
            data: { studentId: entry.studentId, batchId: dto.batchId },
          });
          absencesNotified++;
        }
      }
    }
    return { marked: dto.entries.length, absencesNotified };
  }

  query(dto: QueryAttendanceDto): Promise<Attendance[]> {
    const q: Record<string, unknown> = {};
    if (dto.studentId) q.studentId = new Types.ObjectId(dto.studentId);
    if (dto.batchId) q.batchId = new Types.ObjectId(dto.batchId);
    return this.model.find(q).sort({ date: -1 }).limit(500).lean().exec();
  }
}

/** Strip time so a class day is one bucket. */
function normalizeDate(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
