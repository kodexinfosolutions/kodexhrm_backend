import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateStaffDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() alternatePhone?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() salary?: number;
  @IsOptional() @IsDateString() joiningDate?: string;
  @IsOptional() @IsDateString() relievingDate?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsNumber() perDaySalary?: number;
  @IsOptional() @IsString() shiftId?: string;
  @IsOptional() @IsString() educationalQualification?: string;
  @IsOptional() @IsString() ugDegree?: string;
  @IsOptional() @IsString() pgDegree?: string;
  @IsOptional() @IsBoolean() bEdStatus?: boolean;
  @IsOptional() @IsString() otherQualifications?: string;
  @IsOptional() @IsBoolean() certificatesCollected?: boolean;
  @IsOptional() @IsNumber() yearsOfExperience?: number;
  @IsOptional() @IsString() previousCompany?: string;
  @IsOptional() @IsString() previousSchoolName?: string;
  @IsOptional() @IsString() previousStandardsHandled?: string;
  @IsOptional() @IsString() previousSubjectsHandled?: string;
  @IsOptional() @IsArray() machineryIds?: string[];
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsNumber() numberOfChildren?: number;
  @IsOptional() @IsString() doorNo?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsString() taluk?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() paymentMode?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsString() bankIfsc?: string;
  @IsOptional() @IsString() bankBranch?: string;
  @IsOptional() @IsDateString() pfJoiningDate?: string;
  @IsOptional() @IsString() uanNumber?: string;
  @IsOptional() @IsString() pfNumber?: string;
  @IsOptional() @IsString() esiNumber?: string;
  @IsOptional() @IsBoolean() pfEnabled?: boolean;
  @IsOptional() @IsBoolean() esiEnabled?: boolean;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() form25BRegNo?: string;
}
