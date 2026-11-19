import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class DocumentAssetsDto {
  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  schoolLogo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  companyLogo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  principalSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  directorSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  hrSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  chairmanSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  accountantSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  managerSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000000)
  rubberStamp?: string;
}

export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  schoolName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  schoolCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  companyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  academicYear?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  financialYear?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gstin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cinNo?: string;

  @IsOptional()
  @IsBoolean()
  requireApprovalForAdmission?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApprovalForOnboarding?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAdmissionEditAfterApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowProfileEditAfterApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  enableFeesModule?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePayrollModule?: boolean;

  @IsOptional()
  @IsBoolean()
  enableTransportModule?: boolean;

  @IsOptional()
  @IsBoolean()
  enableStaffModule?: boolean;

  @IsOptional()
  @IsBoolean()
  enableShiftModule?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMachineryModule?: boolean;

  @IsOptional()
  @IsBoolean()
  enableBiometricModule?: boolean;

  @IsOptional()
  @IsBoolean()
  admissionNoAutoGenerate?: boolean;

  @IsOptional()
  @IsBoolean()
  autoGenerateEmployeeCode?: boolean;

  @IsOptional()
  @IsBoolean()
  enableIndividualDemotion?: boolean;

  @IsOptional()
  @IsBoolean()
  enableProbationEvaluation?: boolean;

  @IsOptional()
  @IsBoolean()
  enableShiftRotation?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMachineryAllocation?: boolean;

  @IsOptional()
  @IsBoolean()
  enableProductionIncentives?: boolean;

  @IsOptional()
  @IsBoolean()
  enableOvertimeTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  enableFactoryActCompliance?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMachineryMaintenanceLogs?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDriverRotation?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSplClassTransport?: boolean;

  @IsOptional()
  @IsBoolean()
  enableNightShiftTransit?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMobileFuelLogs?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentAssetsDto)
  documentAssets?: DocumentAssetsDto;
}
