import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantStatus, UserRole, UserStatus } from '@shared/enums';
import { TenantContextStore } from '@common/tenant-context';
import { AuditService } from '@common/audit/audit.service';
import { PasswordService } from '../../auth/password.service';
import { User, UserDocument } from '../users/user.schema';
import { Tenant, TenantDocument } from './tenant.schema';
import { CreateTenantDto, UpdateFlagsDto } from './dto/tenant.dto';

/**
 * Platform-surface tenant management. Provisioning creates the Tenant record
 * AND seeds its first admin user — the user write happens under an audited
 * bypass with the tenant's id set explicitly.
 */
@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<Tenant[]> {
    return this.tenantModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async get(id: string): Promise<Tenant> {
    const t = await this.tenantModel.findById(id).lean().exec();
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  /** Provision a new institute + its first admin. Fully audited. */
  async provision(actor: string, dto: CreateTenantDto): Promise<{ tenantId: string }> {
    const existing = await this.tenantModel.findOne({ subdomain: dto.subdomain.toLowerCase() });
    if (existing) {
      throw new ConflictException('Subdomain already in use');
    }

    const tenant = await this.tenantModel.create({
      name: dto.name,
      subdomain: dto.subdomain.toLowerCase(),
      planId: dto.planId,
      timezone: dto.timezone ?? 'Asia/Kolkata',
      status: TenantStatus.ACTIVE,
    });
    const tenantId = tenant._id.toString();

    // Seed the first admin user under an audited bypass, tenantId set explicitly.
    const passwordHash = await this.passwords.hash(dto.adminPassword);
    await TenantContextStore.runWithBypass(actor, () =>
      this.userModel.create({
        tenantId,
        role: UserRole.ADMIN,
        name: dto.adminName,
        email: dto.adminEmail.toLowerCase(),
        passwordHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await this.audit.record({
      actor,
      action: 'tenant.provision',
      targetTenantId: tenantId,
      meta: { subdomain: tenant.subdomain, adminEmail: dto.adminEmail.toLowerCase() },
    });

    return { tenantId };
  }

  async setStatus(actor: string, id: string, status: TenantStatus): Promise<Tenant> {
    const tenant = await this.tenantModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.audit.record({
      actor,
      action: `tenant.${status === TenantStatus.SUSPENDED ? 'suspend' : 'activate'}`,
      targetTenantId: id,
    });
    return tenant;
  }

  async updateFlags(actor: string, id: string, dto: UpdateFlagsDto): Promise<Tenant> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    tenant.flags = { ...tenant.flags, ...dto.flags };
    await tenant.save();
    await this.audit.record({
      actor,
      action: 'tenant.flags.update',
      targetTenantId: id,
      meta: { flags: dto.flags },
    });
    return tenant;
  }

  /** Assign/change a tenant's plan. */
  async setPlan(actor: string, id: string, planId: string): Promise<Tenant> {
    if (!planId) throw new BadRequestException('planId required');
    const tenant = await this.tenantModel.findByIdAndUpdate(id, { planId }, { new: true });
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.audit.record({
      actor,
      action: 'tenant.plan.set',
      targetTenantId: id,
      meta: { planId },
    });
    return tenant;
  }
}
