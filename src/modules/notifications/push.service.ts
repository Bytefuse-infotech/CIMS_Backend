import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * FCM push delivery. Env-gated: initializes the Firebase Admin SDK when
 * FCM_CREDENTIALS_JSON (a service-account JSON string) is set; otherwise it
 * logs and no-ops so dev/test run without Firebase. SMS can join as a sibling
 * service behind the same NotificationsService seam later.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private app: admin.app.App | null = null;

  constructor(config: ConfigService) {
    const credsJson = config.get<string>('fcm.credentialsJson');
    if (credsJson) {
      try {
        const creds = JSON.parse(credsJson);
        this.app = admin.initializeApp(
          { credential: admin.credential.cert(creds) },
          'coaching-fcm',
        );
        this.logger.log('FCM push enabled (Firebase Admin SDK).');
      } catch (err) {
        this.logger.error(
          'FCM_CREDENTIALS_JSON present but invalid — push disabled.',
          err instanceof Error ? err.stack : String(err),
        );
      }
    } else {
      this.logger.warn('FCM credentials not set — push is a no-op.');
    }
  }

  get enabled(): boolean {
    return this.app !== null;
  }

  /** Send to a set of device tokens. Best-effort: never throws to the caller. */
  async send(msg: PushMessage): Promise<{ sent: number }> {
    if (!this.app || msg.tokens.length === 0) {
      this.logger.debug(`[stub push] ${msg.title} → ${msg.tokens.length} token(s)`);
      return { sent: 0 };
    }
    try {
      const res = await admin.messaging(this.app).sendEachForMulticast({
        tokens: msg.tokens,
        notification: { title: msg.title, body: msg.body },
        data: msg.data,
      });
      return { sent: res.successCount };
    } catch (err) {
      this.logger.error(
        'FCM send failed',
        err instanceof Error ? err.stack : String(err),
      );
      return { sent: 0 };
    }
  }
}
