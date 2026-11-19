import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsArray, ArrayMinSize } from 'class-validator';
import { BonusType, CalculationType, PaymentStatus, BonusApprovalStatus } from '@prisma/client';

export class CreateBonusDto {
  @IsArray()
  @IsNotEmpty()
  staffIds: string[]; // Supports multiple employees

  @IsEnum(BonusType)
  bonusType: BonusType;

  @IsEnum(CalculationType)
  calculationType: CalculationType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @IsOptional()
  percentage?: number;

  @IsString()
  @IsNotEmpty()
  bonusMonth: string; // "YYYY-MM"

  @IsString()
  @IsOptional()
  paymentDate?: string; // "YYYY-MM-DD"

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BonusApprovalStatus)
  @IsOptional()
  approvalStatus?: BonusApprovalStatus;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  transactionRef?: string;
}

export class UpdateBonusDto {
  @IsEnum(BonusType)
  @IsOptional()
  bonusType?: BonusType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  bonusMonth?: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  transactionRef?: string;
}

export class ApproveBonusDto {
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class RejectBonusDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class MarkPaidBonusDto {
  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  transactionRef?: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;
}

export class BulkPayBonusDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];

  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;
}

