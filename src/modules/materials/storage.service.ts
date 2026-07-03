import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CdnConfig } from '../../config/configuration';

export interface SignedUpload {
  uploadUrl: string;
  fileKey: string;
  cdnUrl: string;
}

/**
 * Object storage + CDN seam. Env-gated: when CDN_* are set it issues real
 * presigned S3 upload URLs and can put objects (e.g. receipts); otherwise it
 * returns deterministic stub URLs so dev/test work with no cloud account.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly cfg: CdnConfig;
  private client: S3Client | null = null;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<CdnConfig>('cdn');
    if (this.cfg.enabled) {
      this.client = new S3Client({
        endpoint: this.cfg.endpoint,
        region: process.env.CDN_REGION ?? 'auto',
        credentials: {
          accessKeyId: this.cfg.accessKeyId!,
          secretAccessKey: this.cfg.secretAccessKey!,
        },
        forcePathStyle: true,
      });
      this.logger.log('Storage/CDN enabled (S3 SDK).');
    } else {
      this.logger.warn('CDN keys not set — using stub storage.');
    }
  }

  get enabled(): boolean {
    return this.cfg.enabled;
  }

  private cdnUrl(key: string): string {
    const base = this.cfg.publicBaseUrl ?? 'https://cdn.stub.local';
    return `${base.replace(/\/$/, '')}/${key}`;
  }

  /** Issue a signed URL the client PUTs to directly (keeps large files off the API). */
  async createSignedUpload(filename: string, folder = 'materials'): Promise<SignedUpload> {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `${folder}/${Date.now()}_${safe}`;

    if (this.client) {
      const cmd = new PutObjectCommand({ Bucket: this.cfg.bucket, Key: fileKey });
      const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: 900 });
      return { uploadUrl, fileKey, cdnUrl: this.cdnUrl(fileKey) };
    }
    return {
      uploadUrl: `https://storage.stub.local/upload/${fileKey}?signature=stub`,
      fileKey,
      cdnUrl: this.cdnUrl(fileKey),
    };
  }

  /** Upload bytes we generated server-side (e.g. a receipt PDF). Returns the CDN url. */
  async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.client) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.cfg.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } else {
      this.logger.debug(`[stub storage] would upload ${key} (${body.length} bytes)`);
    }
    return this.cdnUrl(key);
  }
}
