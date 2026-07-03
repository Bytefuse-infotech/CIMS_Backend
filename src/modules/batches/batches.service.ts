import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Batch, BatchDocument } from './batch.schema';
import { Student, StudentDocument } from '../students/student.schema';
import { CreateBatchDto, UpdateBatchDto } from './dto/batch.dto';

@Injectable()
export class BatchesService {
  constructor(
    @InjectModel(Batch.name) private readonly batchModel: Model<BatchDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
  ) {}

  list(): Promise<Batch[]> {
    return this.batchModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async get(id: string): Promise<Batch> {
    const b = await this.batchModel.findById(id).lean().exec();
    if (!b) throw new NotFoundException('Batch not found');
    return b;
  }

  create(dto: CreateBatchDto): Promise<Batch> {
    return this.batchModel.create(dto);
  }

  async update(id: string, dto: UpdateBatchDto): Promise<Batch> {
    const b = await this.batchModel.findByIdAndUpdate(id, dto, { new: true });
    if (!b) throw new NotFoundException('Batch not found');
    return b;
  }

  async remove(id: string): Promise<void> {
    const res = await this.batchModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Batch not found');
  }

  /** Enroll students into a batch (idempotent via $addToSet on both sides). */
  async enroll(batchId: string, studentIds: string[]): Promise<{ enrolled: number }> {
    const batch = await this.batchModel.findById(batchId);
    if (!batch) throw new NotFoundException('Batch not found');

    const res = await this.studentModel.updateMany(
      { _id: { $in: studentIds } },
      { $addToSet: { batchIds: batch._id } },
    );
    return { enrolled: res.modifiedCount };
  }
}
