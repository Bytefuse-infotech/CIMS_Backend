import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class InstallmentDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  dueDate!: string;
}

export class CreateFeePlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @IsMongoId()
  batchId?: string;

  /** Provide explicit installments, OR use `splitInto` to auto-split. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  splitInto?: number;

  @IsOptional()
  @IsDateString()
  firstDueDate?: string;
}

export class GenerateInvoicesDto {
  /** Optional explicit student list; otherwise all students in the plan's batch. */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  studentIds?: string[];
}

export class CreatePaymentOrderDto {
  @IsMongoId()
  invoiceId!: string;
}
