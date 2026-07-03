import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubscriptionStatus } from '@shared/enums';
import { Subscription, SubscriptionDocument } from './subscription.schema';

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subModel: Model<SubscriptionDocument>,
  ) {}

  listSubscriptions(): Promise<Subscription[]> {
    return this.subModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  /** Create/upsert a tenant's platform subscription. */
  async upsert(params: {
    tenantId: string;
    planId: string;
    status?: SubscriptionStatus;
    currentPeriodEnd?: Date;
  }): Promise<Subscription> {
    return this.subModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(params.tenantId) },
      {
        planId: new Types.ObjectId(params.planId),
        status: params.status ?? SubscriptionStatus.ACTIVE,
        currentPeriodEnd: params.currentPeriodEnd,
      },
      { new: true, upsert: true },
    );
  }

  /**
   * Monthly Recurring Revenue: sum of plan.priceMonthly across all active
   * subscriptions. Computed with an aggregation join to plans.
   */
  async mrr(): Promise<{ mrr: number; activeSubscriptions: number; currency: string }> {
    const [row] = await this.subModel.aggregate<{ mrr: number; count: number }>([
      { $match: { status: SubscriptionStatus.ACTIVE } },
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: '$plan' },
      {
        $group: {
          _id: null,
          mrr: { $sum: '$plan.priceMonthly' },
          count: { $sum: 1 },
        },
      },
    ]);
    return {
      mrr: row?.mrr ?? 0,
      activeSubscriptions: row?.count ?? 0,
      currency: 'INR',
    };
  }
}
