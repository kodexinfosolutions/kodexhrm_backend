export enum Permission {
  // ─── STAFF ─────────────────────────────────
  STAFF_CREATE = 'staff:create',
  STAFF_READ = 'staff:read',
  STAFF_UPDATE = 'staff:update',
  STAFF_DELETE = 'staff:delete',

  // ─── USERS ─────────────────────────────────
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // ─── SETTINGS ──────────────────────────────
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // ─── HR CORE ───────────────────────────────
  HR_DASHBOARD = 'hr:dashboard',
  HR_ATTENDANCE_READ = 'hr:attendance:read',
  HR_ATTENDANCE_MANAGE = 'hr:attendance:manage',
  HR_LEAVE_READ = 'hr:leave:read',
  HR_LEAVE_MANAGE = 'hr:leave:manage',
  HR_LEAVE_APPROVE = 'hr:leave:approve',
  HR_PERMISSION_READ = 'hr:permission:read',
  HR_PERMISSION_MANAGE = 'hr:permission:manage',
  HR_PERMISSION_APPROVE = 'hr:permission:approve',
  HR_STATUTORY_READ = 'hr:statutory:read',
  HR_STATUTORY_MANAGE = 'hr:statutory:manage',
  HR_ESSL_READ = 'hr:essl:read',
  HR_ESSL_MANAGE = 'hr:essl:manage',
  HR_PAYROLL_READ = 'hr:payroll:read',
  HR_PAYROLL_MANAGE = 'hr:payroll:manage',
  HR_PAYROLL_APPROVE = 'hr:payroll:approve',

  // ─── SHIFT MANAGEMENT ──────────────────────
  SHIFT_READ = 'shift:read',
  SHIFT_MANAGE = 'shift:manage',

  // ─── SALARY CONFIG & COMPONENTS ────────────
  SALARY_CONFIG_READ = 'salary:config:read',
  SALARY_CONFIG_MANAGE = 'salary:config:manage',

  // ─── BONUS MANAGEMENT ──────────────────────
  BONUS_READ = 'bonus:read',
  BONUS_MANAGE = 'bonus:manage',
  BONUS_APPROVE = 'bonus:approve',

  // ─── PAYSLIP MANAGEMENT ────────────────────
  PAYSLIP_READ = 'payslip:read',
  PAYSLIP_MANAGE = 'payslip:manage',
}
