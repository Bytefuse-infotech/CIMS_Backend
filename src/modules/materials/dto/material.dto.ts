import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MaterialType } from '@shared/enums';

export class CreateMaterialDto {
  @IsMongoId()
  batchId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(MaterialType)
  type!: MaterialType;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  cdnUrl?: string;
}

export class UploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;
}
