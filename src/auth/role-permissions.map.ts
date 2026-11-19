import { Role } from './role.enum';
import { Permission } from './permission.enum';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission) as Permission[],

  [Role.HR_MANAGER]: [
    Permission.STAFF_READ,
    Permission.STAFF_CREATE,
    Permission.STAFF_UPDATE,
    Permission.STAFF_DELETE,
    Permission.USER_READ,
    Permission.SETTINGS_READ,
    Permission.HR_DASHBOARD,
    Permission.HR_ATTENDANCE_READ,
    Permission.HR_ATTENDANCE_MANAGE,
    Permission.HR_LEAVE_READ,
    Permission.HR_LEAVE_MANAGE,
    Permission.HR_LEAVE_APPROVE,
    Permission.HR_PERMISSION_READ,
    Permission.HR_PERMISSION_MANAGE,
    Permission.HR_PERMISSION_APPROVE,
    Permission.HR_STATUTORY_READ,
    Permission.HR_STATUTORY_MANAGE,
    Permission.HR_ESSL_READ,
    Permission.HR_ESSL_MANAGE,
    Permission.HR_PAYROLL_READ,
    Permission.HR_PAYROLL_MANAGE,
    Permission.HR_PAYROLL_APPROVE,
    Permission.SHIFT_READ,
    Permission.SHIFT_MANAGE,
    Permission.SALARY_CONFIG_READ,
    Permission.SALARY_CONFIG_MANAGE,
    Permission.BONUS_READ,
    Permission.BONUS_MANAGE,
    Permission.BONUS_APPROVE,
    Permission.PAYSLIP_READ,
    Permission.PAYSLIP_MANAGE,
  ],

  [Role.STAFF]: [
    Permission.HR_DASHBOARD,
    Permission.HR_ATTENDANCE_READ,
    Permission.HR_LEAVE_READ,
    Permission.HR_LEAVE_MANAGE,
    Permission.HR_PERMISSION_READ,
    Permission.HR_PERMISSION_MANAGE,
    Permission.HR_PAYROLL_READ,
    Permission.PAYSLIP_READ,
  ],
};

export const DEFAULT_ROLE_PERMISSIONS = ROLE_PERMISSIONS;

