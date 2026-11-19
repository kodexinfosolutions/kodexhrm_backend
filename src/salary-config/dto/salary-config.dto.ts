import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, Min, IsArray } from 'class-validator';
import { ComponentType, CalculationType, ComponentFrequency } from '@prisma/client';

export class CreateComponentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(ComponentType)
  type: ComponentType;

  @IsEnum(CalculationType)
  calculationType: CalculationType;

  @IsEnum(ComponentFrequency)
  @IsOptional()
  frequency?: ComponentFrequency;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultPercent?: number;

  @IsBoolean()
  @IsOptional()
  isStatutory?: boolean;

  @IsBoolean()
  @IsOptional()
  isTaxable?: boolean;

  @IsBoolean()
  @IsOptional()
  isVariable?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateComponentDto extends CreateComponentDto {}

export class ComponentAssignmentItemDto {
  @IsString()
  @IsNotEmpty()
  componentId: string;

  @IsEnum(CalculationType)
  calculationType: CalculationType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  percentage?: number;
}

export class SaveEmployeeStructureDto {
  @IsString()
  @IsNotEmpty()
  effectiveFrom: string; // "YYYY-MM-DD"

  @IsNumber()
  @Min(0)
  grossSalary: number;

  @IsArray()
  items: ComponentAssignmentItemDto[];
}

export class PreviewCalculationDto {
  @IsNumber()
  @Min(0)
  grossSalary: number;

  @IsArray()
  items: ComponentAssignmentItemDto[];
}

