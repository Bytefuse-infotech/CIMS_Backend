import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateStudentDto {
  @IsMongoId()
  userId!: string;

  @IsOptional()
  @IsMongoId()
  parentUserId?: string;

  @IsString()
  @IsNotEmpty()
  rollNo!: string;

  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  batchIds?: string[];
}

export class UpdateStudentDto {
  @IsOptional()
  @IsMongoId()
  parentUserId?: string;

  @IsOptional()
  @IsString()
  rollNo?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  batchIds?: string[];
}
