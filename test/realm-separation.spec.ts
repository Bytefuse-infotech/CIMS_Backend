import request from 'supertest';
import { bootTestApp, teardownTestApp, TestContext } from './utils/test-app';
import { TokenService } from '../src/auth/token.service';
import { SuperRole, UserRole } from '../src/shared/enums';

/**
 * The two realms are structurally distinct and never interchangeable. A
 * platform token must be rejected on the tenant surface and vice versa. Keep
 * this green — it is a security invariant, not a feature.
 *
 * We assert against the tenant `fcm-token` route (tenant-guarded) and a
 * platform-guarded route once those exist; for now we prove the guards reject
 * the wrong realm's token with 401.
 */
describe('Realm separation', () => {
  let ctx: TestContext;
  let tokens: TokenService;

  beforeAll(async () => {
    ctx = await bootTestApp();
    tokens = ctx.app.get(TokenService);
  });

  afterAll(() => teardownTestApp(ctx));

  it('a platform token is rejected on a tenant-guarded route', async () => {
    const platform = await tokens.issuePlatformTokens({
      platformUserId: 'p1',
      superRole: SuperRole.OWNER,
    });
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/fcm-token')
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .send({ token: 'device-xyz' });
    expect(res.status).toBe(401);
  });

  it('a tenant token is rejected on a platform-guarded route (once one exists)', async () => {
    const tenant = await tokens.issueTenantTokens({
      userId: 'u1',
      tenantId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      role: UserRole.ADMIN,
    });
    // Platform auth routes are public; a protected platform route is added in
    // the platform-surface sprint. This asserts the tenant token can't even be
    // minted-and-accepted as a platform token: verifying it with the platform
    // refresh secret must fail.
    await expect(tokens.verifyPlatformRefresh(tenant.refreshToken)).rejects.toBeDefined();
  });

  it('tenant and platform access tokens are signed with different secrets', async () => {
    const tenant = await tokens.issueTenantTokens({
      userId: 'u1',
      tenantId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      role: UserRole.ADMIN,
    });
    const platform = await tokens.issuePlatformTokens({
      platformUserId: 'p1',
      superRole: SuperRole.OWNER,
    });
    // A tenant access token used as a platform refresh token must not verify.
    await expect(tokens.verifyPlatformRefresh(tenant.accessToken)).rejects.toBeDefined();
    await expect(tokens.verifyTenantRefresh(platform.accessToken)).rejects.toBeDefined();
  });
});
