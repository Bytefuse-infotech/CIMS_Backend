import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { TenantStatus } from '@shared/enums';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** DNS-safe subdomain. */
  @Matches(/^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$/, {
    message: 'subdomain must be lowercase alphanumeric/hyphen, 3-32 chars',
  })
  subdomain!: string;

  @IsOptional()
  @IsMongoId()
  planId?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  // First admin user seeded for the tenant.
  @IsString()
  @IsNotEmpty()
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatus)
  status!: TenantStatus;
}

export class UpdateFlagsDto {
  @IsObject()
  flags!: Record<string, boolean>;
}

export class SetFlagDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsBoolean()
  value!: boolean;
}
