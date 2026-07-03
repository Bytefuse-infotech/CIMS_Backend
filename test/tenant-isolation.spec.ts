import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { bootTestApp, teardownTestApp, TestContext } from './utils/test-app';
import { TenantContextStore } from '../src/common/tenant-context';
import { User, UserDocument } from '../src/modules/users/user.schema';
import { UserRole, UserStatus } from '../src/shared/enums';

/**
 * The single most important guarantee in the system: tenant A can never read
 * tenant B's data, and a query with no tenant context fails CLOSED rather than
 * leaking everything. Keep this green.
 */
describe('Tenant isolation (Mongoose plugin)', () => {
  let ctx: TestContext;
  let userModel: Model<UserDocument>;

  const TENANT_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const TENANT_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';

  beforeAll(async () => {
    ctx = await bootTestApp();
    userModel = ctx.app.get<Model<UserDocument>>(getModelToken(User.name));

    // Seed one user in each tenant, each inside its own context.
    await TenantContextStore.run({ tenantId: TENANT_A }, () =>
      userModel.create({
        name: 'Alice Admin',
        email: 'alice@a.test',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    await TenantContextStore.run({ tenantId: TENANT_B }, () =>
      userModel.create({
        name: 'Bob Admin',
        email: 'bob@b.test',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
  });

  afterAll(() => teardownTestApp(ctx));

  it('stamps tenantId on create from context', async () => {
    const a = await TenantContextStore.run({ tenantId: TENANT_A }, () =>
      userModel.findOne({ email: 'alice@a.test' }).exec(),
    );
    expect(a?.tenantId).toBe(TENANT_A);
  });

  it('tenant A cannot read tenant B documents', async () => {
    const found = await TenantContextStore.run({ tenantId: TENANT_A }, () =>
      userModel.findOne({ email: 'bob@b.test' }).exec(),
    );
    expect(found).toBeNull();
  });

  it('a broad find only returns the current tenant rows', async () => {
    const aRows = await TenantContextStore.run({ tenantId: TENANT_A }, () =>
      userModel.find({}).exec(),
    );
    expect(aRows).toHaveLength(1);
    expect(aRows[0].email).toBe('alice@a.test');

    const bRows = await TenantContextStore.run({ tenantId: TENANT_B }, () =>
      userModel.find({}).exec(),
    );
    expect(bRows).toHaveLength(1);
    expect(bRows[0].email).toBe('bob@b.test');
  });

  it('a caller-supplied cross-tenant filter cannot widen scope', async () => {
    // Ask (from A's context) for B's tenantId explicitly — the plugin overrides
    // the supplied tenantId with the context's, so you get A's rows, never B's.
    const rows = await TenantContextStore.run({ tenantId: TENANT_A }, () =>
      userModel.find({ tenantId: TENANT_B }).exec(),
    );
    expect(rows.every((r) => r.tenantId === TENANT_A)).toBe(true);
    expect(rows.some((r) => r.email === 'bob@b.test')).toBe(false);
  });

  it('updates cannot cross tenants', async () => {
    await TenantContextStore.run({ tenantId: TENANT_A }, () =>
      userModel.updateMany({}, { $set: { name: 'HACKED' } }).exec(),
    );
    const bob = await TenantContextStore.run({ tenantId: TENANT_B }, () =>
      userModel.findOne({ email: 'bob@b.test' }).exec(),
    );
    expect(bob?.name).toBe('Bob Admin'); // untouched
  });

  it('aggregation is scoped to the current tenant', async () => {
    const counts = await TenantContextStore.run({ tenantId: TENANT_A }, () =>
      userModel.aggregate([{ $count: 'n' }]).exec(),
    );
    expect(counts[0]?.n ?? 0).toBe(1);
  });

  it('fails closed: a tenant query with NO context throws', async () => {
    await expect(userModel.find({}).exec()).rejects.toThrow(/no tenant context/i);
  });

  it('bypass reads across all tenants (platform surface)', async () => {
    const all = await TenantContextStore.runWithBypass('platform-owner-1', () =>
      userModel.find({}).exec(),
    );
    expect(all.length).toBeGreaterThanOrEqual(2);
    const emails = all.map((u) => u.email).sort();
    expect(emails).toEqual(['alice@a.test', 'bob@b.test']);
  });
});
