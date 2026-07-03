import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './plan.schema';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

@Injectable()
export class PlansService {
  constructor(@InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>) {}

  list(): Promise<Plan[]> {
    return this.planModel.find().sort({ priceMonthly: 1 }).lean().exec();
  }

  create(dto: CreatePlanDto): Promise<Plan> {
    return this.planModel.create(dto);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.planModel.findByIdAndUpdate(id, dto, { new: true });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
}
