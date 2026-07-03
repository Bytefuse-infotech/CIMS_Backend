import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student, StudentDocument } from './student.schema';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(@InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>) {}

  list(): Promise<Student[]> {
    return this.studentModel.find().sort({ rollNo: 1 }).lean().exec();
  }

  async get(id: string): Promise<Student> {
    const s = await this.studentModel.findById(id).lean().exec();
    if (!s) throw new NotFoundException('Student not found');
    return s;
  }

  create(dto: CreateStudentDto): Promise<Student> {
    return this.studentModel.create(dto);
  }

  async update(id: string, dto: UpdateStudentDto): Promise<Student> {
    const s = await this.studentModel.findByIdAndUpdate(id, dto, { new: true });
    if (!s) throw new NotFoundException('Student not found');
    return s;
  }

  async remove(id: string): Promise<void> {
    const res = await this.studentModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Student not found');
  }

  /** Students in a batch — used by attendance/fee generation. */
  listByBatch(batchId: string): Promise<Student[]> {
    return this.studentModel.find({ batchIds: batchId }).lean().exec();
  }
}
