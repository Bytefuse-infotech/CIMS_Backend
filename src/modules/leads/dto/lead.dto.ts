import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from '@shared/enums';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;
}

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}
