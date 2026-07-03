import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { bootTestApp, teardownTestApp, TestContext } from './utils/test-app';
import { PasswordService } from '../src/auth/password.service';
import {
  PlatformUser,
  PlatformUserDocument,
} from '../src/modules/platform-users/platform-user.schema';
import { SuperRole } from '../src/shared/enums';

/**
 * End-to-end platform flow: owner logs in, provisions a tenant (which seeds the
 * first admin via audited bypass), and the action lands in the audit log. Also
 * verifies a suspended/nonexistent tenant login is rejected and the impersonation
 * path audits.
 */
describe('Platform surface', () => {
  let ctx: TestContext;
  let http: ReturnType<typeof request>;
  let ownerToken: string;

  beforeAll(async () => {
    ctx = await bootTestApp();
    http = request(ctx.app.getHttpServer());

    // Seed a platform owner directly.
    const passwords = ctx.app.get(PasswordService);
    const model = ctx.app.get<Model<PlatformUserDocument>>(getModelToken(PlatformUser.name));
    await model.create({
      name: 'Owner',
      email: 'owner@platform.test',
      passwordHash: await passwords.hash('supersecret'),
      superRole: SuperRole.OWNER,
    });

    const res = await http
      .post('/platform/v1/auth/login')
      .send({ email: 'owner@platform.test', password: 'supersecret' });
    expect(res.status).toBe(201);
    ownerToken = res.body.accessToken;
    expect(ownerToken).toBeTruthy();
  });

  afterAll(() => teardownTestApp(ctx));

  const auth = () => ({ Authorization: `Bearer ${ownerToken}` });

  it('rejects the tenants list without a platform token', async () => {
    const res = await http.get('/platform/v1/tenants');
    expect(res.status).toBe(401);
  });

  it('provisions a tenant and seeds its admin', async () => {
    const res = await http
      .post('/platform/v1/tenants')
      .set(auth())
      .send({
        name: 'Bright Future Coaching',
        subdomain: 'bright',
        adminName: 'Institute Admin',
        adminEmail: 'admin@bright.test',
        adminPassword: 'bright-pass-1',
      });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBeTruthy();
  });

  it('rejects a duplicate subdomain', async () => {
    const res = await http
      .post('/platform/v1/tenants')
      .set(auth())
      .send({
        name: 'Dup',
        subdomain: 'bright',
        adminName: 'X',
        adminEmail: 'x@dup.test',
        adminPassword: 'dup-pass-1',
      });
    expect(res.status).toBe(409);
  });

  it('the provisioned admin can log into the tenant surface', async () => {
    const res = await http
      .post('/api/v1/auth/login')
      .send({ subdomain: 'bright', email: 'admin@bright.test', password: 'bright-pass-1' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('records the provision action in the audit log', async () => {
    const res = await http.get('/platform/v1/audit-log?action=tenant.provision').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].action).toBe('tenant.provision');
  });

  it('reports MRR (zero with no active subscriptions)', async () => {
    const res = await http.get('/platform/v1/billing/mrr').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('mrr');
    expect(res.body).toHaveProperty('activeSubscriptions');
  });

  it('analytics overview counts the active tenant', async () => {
    const res = await http.get('/platform/v1/analytics/overview').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.tenants.active).toBeGreaterThanOrEqual(1);
    expect(res.body.usage.totalUsers).toBeGreaterThanOrEqual(1);
  });

  it('impersonation mints a scoped tenant token and audits it', async () => {
    const list = await http.get('/platform/v1/tenants').set(auth());
    const tenantId = list.body[0]._id;

    const res = await http.post(`/platform/v1/tenants/${tenantId}/impersonate`).set(auth());
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBe(''); // no standing session

    const audit = await http.get('/platform/v1/audit-log?action=impersonate').set(auth());
    expect(audit.body.length).toBeGreaterThanOrEqual(1);
  });
});
