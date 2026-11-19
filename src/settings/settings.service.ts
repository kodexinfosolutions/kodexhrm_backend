import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdminSettingsDto } from './update-admin-settings.dto';
import { RolePermissionsService } from '../auth/role-permissions.service';
import { UpdateUserPermissionsDto } from './update-user-permissions.dto';

const SETTINGS_KEY = 'admin.settings';
const FEE_RECEIPT_FIELDS_KEY = 'fees.receiptFields';
const LEGACY_SCHOOL_NAME = 'PSF Public School';
const LEGACY_CURRENT_SCHOOL_NAME = 'PSF Matriculation Higher Secondary School';
const DEFAULT_ENTERPRISE_NAME = 'TEXTILE MANUFACTURING MILLS PRIVATE LIMITED';
const DEFAULT_ENTERPRISE_CODE = 'TEX-MILL';
const DEFAULT_FINANCIAL_YEAR = '2026-2027';
const DEFAULT_ENTERPRISE_ADDRESS = 'SF No. 124/2, Mill Road, Avinashi, Tirupur, Tamil Nadu - 641602';

const DOCUMENT_ASSET_KEYS = [
  'schoolLogo',
  'companyLogo',
  'principalSignature',
  'directorSignature',
  'hrSignature',
  'chairmanSignature',
  'accountantSignature',
  'managerSignature',
  'rubberStamp',
] as const;

type DocumentAssetKey = (typeof DOCUMENT_ASSET_KEYS)[number];

const DEFAULT_DOCUMENT_ASSETS: Record<DocumentAssetKey, string> = {
  schoolLogo: '',
  companyLogo: '',
  principalSignature: '',
  directorSignature: '',
  hrSignature: '',
  chairmanSignature: '',
  accountantSignature: '',
  managerSignature: '',
  rubberStamp: '',
};

const DEFAULT_SETTINGS = {
  schoolName: DEFAULT_ENTERPRISE_NAME,
  companyName: DEFAULT_ENTERPRISE_NAME,
  schoolCode: DEFAULT_ENTERPRISE_CODE,
  companyCode: DEFAULT_ENTERPRISE_CODE,
  academicYear: DEFAULT_FINANCIAL_YEAR,
  financialYear: DEFAULT_FINANCIAL_YEAR,
  address: DEFAULT_ENTERPRISE_ADDRESS,
  gstin: '33AAAAA0000A1Z5',
  cinNo: 'U17111TZ2020PTC012345',
  requireApprovalForAdmission: false,
  requireApprovalForOnboarding: false,
  allowAdmissionEditAfterApproval: false,
  allowProfileEditAfterApproval: false,
  enableFeesModule: true,
  enablePayrollModule: true,
  enableStaffModule: true,
  enableShiftModule: true,
  enableMachineryModule: true,
  enableBiometricModule: true,
  admissionNoAutoGenerate: true,
  autoGenerateEmployeeCode: true,
  enableIndividualDemotion: false,
  enableProbationEvaluation: false,
  enableShiftRotation: true,
  enableMachineryAllocation: true,
  enableProductionIncentives: true,
  enableOvertimeTracking: true,
  enableFactoryActCompliance: true,
  enableMachineryMaintenanceLogs: true,
  documentAssets: DEFAULT_DOCUMENT_ASSETS,
};

const DEFAULT_FEE_RECEIPT_FIELDS = {
  tuitionFee: { label: 'Tuition Fee', enabled: true, order: 1 },
  transportFee: { label: 'Transport Fee', enabled: true, order: 2 },
  bookFee: { label: 'Book Fee', enabled: true, order: 3 },
  hostelFee: { label: 'Hostel Fee', enabled: false, order: 4 },
  otherFee: { label: 'Other Fee', enabled: false, order: 5 },
  labFee: { label: 'Lab Fee', enabled: false, order: 6 },
  sportsFee: { label: 'Sports Fee', enabled: false, order: 7 },
  examFee: { label: 'Exam Fee', enabled: false, order: 8 },
  libraryFee: { label: 'Library Fee', enabled: false, order: 9 },
  uniformFee: { label: 'Uniform Fee', enabled: false, order: 10 },
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  async getAdminSettings() {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (!row) return DEFAULT_SETTINGS;

    const merged = {
      ...DEFAULT_SETTINGS,
      ...(row.value as Record<string, unknown>),
    };

    // Keep legacy data backward compatible by rewriting old school names to enterprise standards
    if (
      (merged.schoolName as string | undefined) === LEGACY_SCHOOL_NAME ||
      (merged.schoolName as string | undefined) === LEGACY_CURRENT_SCHOOL_NAME
    ) {
      merged.schoolName = DEFAULT_ENTERPRISE_NAME;
    }
    if ((merged.schoolCode as string | undefined) === 'PSF') {
      merged.schoolCode = DEFAULT_ENTERPRISE_CODE;
    }

    if (!merged.companyName) {
      merged.companyName = merged.schoolName || DEFAULT_ENTERPRISE_NAME;
    }
    if (!merged.companyCode) {
      merged.companyCode = merged.schoolCode || DEFAULT_ENTERPRISE_CODE;
    }
    if (!merged.financialYear) {
      merged.financialYear = merged.academicYear || DEFAULT_FINANCIAL_YEAR;
    }

    return {
      ...merged,
      documentAssets: this.normalizeDocumentAssets(
        (merged as Record<string, unknown>).documentAssets,
      ),
    };
  }

  async updateAdminSettings(
    data: UpdateAdminSettingsDto,
    updatedByEmail?: string,
  ) {
    const existing = await this.prisma.appSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    // Synchronize enterprise and legacy field values
    const normalizedData = { ...data };
    if (normalizedData.companyName && !normalizedData.schoolName) {
      normalizedData.schoolName = normalizedData.companyName;
    } else if (normalizedData.schoolName && !normalizedData.companyName) {
      normalizedData.companyName = normalizedData.schoolName;
    }

    if (normalizedData.companyCode && !normalizedData.schoolCode) {
      normalizedData.schoolCode = normalizedData.companyCode;
    } else if (normalizedData.schoolCode && !normalizedData.companyCode) {
      normalizedData.companyCode = normalizedData.schoolCode;
    }

    if (normalizedData.financialYear && !normalizedData.academicYear) {
      normalizedData.academicYear = normalizedData.financialYear;
    } else if (normalizedData.academicYear && !normalizedData.financialYear) {
      normalizedData.financialYear = normalizedData.academicYear;
    }

    if (normalizedData.requireApprovalForOnboarding !== undefined) {
      normalizedData.requireApprovalForAdmission = normalizedData.requireApprovalForOnboarding;
    }
    if (normalizedData.allowProfileEditAfterApproval !== undefined) {
      normalizedData.allowAdmissionEditAfterApproval = normalizedData.allowProfileEditAfterApproval;
    }
    if (normalizedData.autoGenerateEmployeeCode !== undefined) {
      normalizedData.admissionNoAutoGenerate = normalizedData.autoGenerateEmployeeCode;
    }
    if (normalizedData.enableProbationEvaluation !== undefined) {
      normalizedData.enableIndividualDemotion = normalizedData.enableProbationEvaluation;
    }
    if (normalizedData.enablePayrollModule !== undefined) {
      normalizedData.enableFeesModule = normalizedData.enablePayrollModule;
    }
    if (normalizedData.enableNightShiftTransit !== undefined) {
      normalizedData.enableSplClassTransport = normalizedData.enableNightShiftTransit;
    }

    const merged = {
      ...DEFAULT_SETTINGS,
      ...(existing?.value as Record<string, unknown> | undefined),
      ...normalizedData,
    };

    const safeDocumentAssets = this.normalizeDocumentAssets(
      (merged as Record<string, unknown>).documentAssets,
    );

    // Sync asset aliases
    if (safeDocumentAssets.companyLogo && !safeDocumentAssets.schoolLogo) {
      safeDocumentAssets.schoolLogo = safeDocumentAssets.companyLogo;
    } else if (safeDocumentAssets.schoolLogo && !safeDocumentAssets.companyLogo) {
      safeDocumentAssets.companyLogo = safeDocumentAssets.schoolLogo;
    }

    if (safeDocumentAssets.directorSignature && !safeDocumentAssets.principalSignature) {
      safeDocumentAssets.principalSignature = safeDocumentAssets.directorSignature;
    } else if (safeDocumentAssets.principalSignature && !safeDocumentAssets.directorSignature) {
      safeDocumentAssets.directorSignature = safeDocumentAssets.principalSignature;
    }

    const finalValue = {
      ...merged,
      documentAssets: safeDocumentAssets,
    };

    const saved = await this.prisma.appSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: {
        value: finalValue,
      },
      create: {
        key: SETTINGS_KEY,
        value: finalValue,
      },
    });

    return {
      key: saved.key,
      settings: saved.value,
      updatedByEmail: updatedByEmail ?? null,
      updatedAt: saved.updatedAt,
    };
  }

  private normalizeDocumentAssets(
    value: unknown,
  ): Record<DocumentAssetKey, string> {
    const input =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
    const normalized: Record<DocumentAssetKey, string> = {
      ...DEFAULT_DOCUMENT_ASSETS,
    };

    for (const key of DOCUMENT_ASSET_KEYS) {
      const raw = input[key];
      if (typeof raw === 'string') normalized[key] = raw;
    }

    return normalized;
  }

  async getRolePermissionsConfig() {
    return this.rolePermissionsService.getRolePermissionsConfig();
  }

  async updateRolePermissionsConfig(
    rolePermissions: Record<string, string[]>,
    updatedByEmail?: string,
  ) {
    const savedRolePermissions =
      await this.rolePermissionsService.updateRolePermissionsMap(
        rolePermissions,
        updatedByEmail,
      );

    return {
      rolePermissions: savedRolePermissions,
      updatedByEmail: updatedByEmail ?? null,
    };
  }

  async getUserPermissionOverridesConfig() {
    const [overrideConfig, users] = await Promise.all([
      this.rolePermissionsService.getUserPermissionOverridesConfig(),
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      permissions: overrideConfig.permissions,
      userPermissionOverrides: overrideConfig.userPermissionOverrides,
      users,
    };
  }

  async updateUserPermissionOverrideConfig(
    userId: string,
    body: UpdateUserPermissionsDto,
    updatedByEmail?: string,
  ) {
    const normalizedUserId = String(userId);
    const saved = await this.rolePermissionsService.setUserPermissionOverride(
      normalizedUserId,
      {
        grants: body.grants ?? [],
        revokes: body.revokes ?? [],
      },
      updatedByEmail,
    );

    return {
      userId: normalizedUserId,
      override: saved,
      updatedByEmail: updatedByEmail ?? null,
    };
  }

  async getFeeReceiptFields() {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: FEE_RECEIPT_FIELDS_KEY },
    });
    if (!row) return DEFAULT_FEE_RECEIPT_FIELDS;
    return {
      ...DEFAULT_FEE_RECEIPT_FIELDS,
      ...(row.value as Record<string, unknown>),
    };
  }

  async updateFeeReceiptFields(
    fields: Record<string, any>,
    updatedByEmail?: string,
  ) {
    const saved = await this.prisma.appSetting.upsert({
      where: { key: FEE_RECEIPT_FIELDS_KEY },
      update: { value: fields },
      create: {
        key: FEE_RECEIPT_FIELDS_KEY,
        value: fields,
      },
    });
    return saved.value;
  }
}
