import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanTier } from '@shared/enums';

class PlanLimitsDto {
  @IsInt()
  @Min(1)
  students!: number;

  @IsInt()
  @Min(1)
  storageGb!: number;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(PlanTier)
  tier!: PlanTier;

  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits!: PlanLimitsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits?: PlanLimitsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}
