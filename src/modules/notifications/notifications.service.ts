import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '@shared/enums';
import { Notification, NotificationDocument } from './notification.schema';

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
 * here so a real delivery channel (FCM push, later SMS) drops in behind the same
 * `dispatch` seam. For now it persists as QUEUED and logs — no external sends.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
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
   * Delivery seam. Real FCM/SMS providers implement this later; for now we mark
   * it sent and log. Kept private + overridable so channels plug in cleanly.
   */
  private async dispatch(doc: NotificationDocument): Promise<void> {
    this.logger.debug(
      `[stub dispatch] ${doc.channel} → user ${doc.userId.toString()}: ${doc.title}`,
    );
    doc.status = NotificationStatus.SENT;
    doc.sentAt = new Date();
    await doc.save();
  }

  /** List a user's notifications (student/parent inbox). */
  list(userId: string): Promise<Notification[]> {
    return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).limit(100).lean().exec();
  }
}
