import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsMongoId()
  batchId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsDateString()
  dueDate!: string;
}

export class SubmitAssignmentDto {
  @IsMongoId()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;
}

export class GradeSubmissionDto {
  @IsString()
  @IsNotEmpty()
  grade!: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class CreateTestDto {
  @IsMongoId()
  batchId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsInt()
  @Min(1)
  maxMarks!: number;

  @IsDateString()
  date!: string;
}

export class RecordScoreDto {
  @IsMongoId()
  studentId!: string;

  @IsNumber()
  @Min(0)
  marks!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
