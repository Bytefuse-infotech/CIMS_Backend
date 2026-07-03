import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeadStatus } from '@shared/enums';
import { Lead, LeadDocument } from './lead.schema';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(@InjectModel(Lead.name) private readonly model: Model<LeadDocument>) {}

  list(status?: LeadStatus): Promise<Lead[]> {
    const q = status ? { status } : {};
    return this.model.find(q).sort({ createdAt: -1 }).lean().exec();
  }

  create(dto: CreateLeadDto): Promise<Lead> {
    return this.model.create({
      ...dto,
      assignedTo: dto.assignedTo ? new Types.ObjectId(dto.assignedTo) : undefined,
    });
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const update: Record<string, unknown> = {};
    if (dto.status) update.status = dto.status;
    if (dto.assignedTo) update.assignedTo = new Types.ObjectId(dto.assignedTo);
    const lead = await this.model.findByIdAndUpdate(id, update, { new: true });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async addNote(id: string, text: string, by: string): Promise<Lead> {
    const lead = await this.model.findByIdAndUpdate(
      id,
      { $push: { notes: { text, at: new Date(), by: new Types.ObjectId(by) } } },
      { new: true },
    );
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
