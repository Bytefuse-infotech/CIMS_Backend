import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/tenant/tenant-auth.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { InvoiceStatus, UserRole } from '@shared/enums';
import { FeesService } from './fees.service';
import { CreateFeePlanDto, CreatePaymentOrderDto, GenerateInvoicesDto } from './dto/fee.dto';

/** Tenant surface — /api/v1. Fee plans, invoices, and payment orders. */
@Controller()
@UseGuards(TenantAuthGuard)
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get('fee-plans')
  listPlans() {
    return this.fees.listPlans();
  }

  @Post('fee-plans')
  @Roles(UserRole.ADMIN)
  createPlan(@Body() dto: CreateFeePlanDto) {
    return this.fees.createPlan(dto);
  }

  @Post('fee-plans/:id/generate-invoices')
  @Roles(UserRole.ADMIN)
  generate(@Param('id') id: string, @Body() dto: GenerateInvoicesDto) {
    return this.fees.generateInvoices(id, dto);
  }

  @Get('invoices')
  listInvoices(@Query('studentId') studentId?: string, @Query('status') status?: InvoiceStatus) {
    return this.fees.listInvoices({ studentId, status });
  }

  @Get('invoices/:id/receipt')
  async receipt(@Param('id') id: string) {
    const inv = await this.fees.getInvoice(id);
    // Receipt PDF generation is deferred; return the stored url (may be empty).
    return { receiptUrl: inv.receiptUrl ?? null };
  }

  @Post('payments/order')
  createOrder(@Body() dto: CreatePaymentOrderDto) {
    return this.fees.createPaymentOrder(dto.invoiceId);
  }
}
