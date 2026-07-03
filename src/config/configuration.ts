export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  tenantJwt: RealmJwtConfig;
  platformJwt: RealmJwtConfig;
  impersonationExpires: string;
  throttle: { ttl: number; limit: number };
  razorpay: RazorpayConfig;
  fcm: { credentialsJson?: string };
  cdn: CdnConfig;
}

export interface RazorpayConfig {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  /** Convenience: true when both key id and secret are present. */
  enabled: boolean;
}

export interface CdnConfig {
  /** S3-compatible endpoint/bucket for signed uploads. */
  endpoint?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
  enabled: boolean;
}

export interface RealmJwtConfig {
  accessSecret: string;
  accessExpires: string;
  refreshSecret: string;
  refreshExpires: string;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/coaching',
  tenantJwt: {
    accessSecret: process.env.TENANT_JWT_SECRET ?? 'dev-tenant-secret-change-me',
    accessExpires: process.env.TENANT_JWT_EXPIRES ?? '15m',
    refreshSecret: process.env.TENANT_REFRESH_SECRET ?? 'dev-tenant-refresh-secret-change-me',
    refreshExpires: process.env.TENANT_REFRESH_EXPIRES ?? '7d',
  },
  platformJwt: {
    accessSecret: process.env.PLATFORM_JWT_SECRET ?? 'dev-platform-secret-change-me',
    accessExpires: process.env.PLATFORM_JWT_EXPIRES ?? '15m',
    refreshSecret: process.env.PLATFORM_REFRESH_SECRET ?? 'dev-platform-refresh-secret-change-me',
    refreshExpires: process.env.PLATFORM_REFRESH_EXPIRES ?? '7d',
  },
  impersonationExpires: process.env.IMPERSONATION_JWT_EXPIRES ?? '10m',
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '10', 10),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    enabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  },
  fcm: {
    credentialsJson: process.env.FCM_CREDENTIALS_JSON,
  },
  cdn: {
    endpoint: process.env.CDN_ENDPOINT,
    bucket: process.env.CDN_BUCKET,
    accessKeyId: process.env.CDN_ACCESS_KEY_ID,
    secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY,
    publicBaseUrl: process.env.CDN_PUBLIC_BASE_URL,
    enabled: !!(
      process.env.CDN_ENDPOINT &&
      process.env.CDN_BUCKET &&
      process.env.CDN_ACCESS_KEY_ID &&
      process.env.CDN_SECRET_ACCESS_KEY
    ),
  },
});
