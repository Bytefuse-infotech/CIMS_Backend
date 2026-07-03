export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  tenantJwt: RealmJwtConfig;
  platformJwt: RealmJwtConfig;
  impersonationExpires: string;
  throttle: { ttl: number; limit: number };
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
});
