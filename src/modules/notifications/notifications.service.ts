import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '@shared/enums';
import { User, UserDocument } from '../users/user.schema';
import { Notification, NotificationDocument } from './notification.schema';
import { PushService } from './push.service';

export interface NotifyInput {
  userId: string | Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
}

/**
 * Central notification pipeline. Every event-driven notification routes through
 * here so a real delivery channel drops in behind the `dispatch` seam. Push goes
 * out via PushService (FCM when configured, no-op otherwise); SMS can be added
 * as another branch later.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly push: PushService,
  ) {}

  /** Create a notification and (stub) dispatch it. */
  async notify(input: NotifyInput): Promise<Notification> {
    const doc = await this.notificationModel.create({
      userId: input.userId,
      channel: input.channel ?? NotificationChannel.PUSH,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      status: NotificationStatus.QUEUED,
    });
    await this.dispatch(doc);
    return doc;
  }

  /**
   * Delivery seam. Resolves the user's device tokens and sends via PushService
   * (FCM when configured, else a logged no-op). Delivery is best-effort — a send
   * failure marks the record FAILED but never throws to the caller.
   */
  private async dispatch(doc: NotificationDocument): Promise<void> {
    try {
      if (doc.channel === NotificationChannel.PUSH) {
        const user = await this.userModel
          .findById(doc.userId)
          .select('fcmTokens')
          .lean()
          .exec();
        const tokens = user?.fcmTokens ?? [];
        await this.push.send({
          tokens,
          title: doc.title,
          body: doc.body,
          data: doc.data ? stringifyData(doc.data) : undefined,
        });
      }
      doc.status = NotificationStatus.SENT;
      doc.sentAt = new Date();
    } catch (err) {
      this.logger.error(
        `Dispatch failed for notification ${doc._id.toString()}`,
        err instanceof Error ? err.stack : String(err),
      );
      doc.status = NotificationStatus.FAILED;
    }
    await doc.save();
  }

  /** List a user's notifications (student/parent inbox). */
  list(userId: string): Promise<Notification[]> {
    return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).limit(100).lean().exec();
  }
}

/** FCM data payloads must be string→string. */
function stringifyData(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}
