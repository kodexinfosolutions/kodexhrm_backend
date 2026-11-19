import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  startTime: string; // "08:00"

  @IsString()
  @IsNotEmpty()
  endTime: string; // "17:00"

  @IsInt()
  @Min(0)
  @IsOptional()
  breakDuration?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  gracePeriod?: number;

  @IsString()
  @IsOptional()
  weeklyOff?: string;

  @IsBoolean()
  @IsOptional()
  isNightShift?: boolean;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateShiftDto extends CreateShiftDto {}

export class AssignShiftDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @IsString()
  @IsNotEmpty()
  effectiveFrom: string; // "YYYY-MM-DD"

  @IsString()
  @IsOptional()
  effectiveTo?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkAssignShiftDto {
  @IsNotEmpty()
  staffIds: string[];

  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @IsString()
  @IsNotEmpty()
  effectiveFrom: string;

  @IsString()
  @IsOptional()
  effectiveTo?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

