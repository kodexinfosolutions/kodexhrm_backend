import { PrismaClient, Role, StaffCategory, ComponentType, CalculationType, ComponentFrequency } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding standalone HR module database...');

  // 1. Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hr.com' },
    update: { password: hashedPassword },
    create: {
      name: 'HR Administrator',
      email: 'admin@hr.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('Admin user ready:', adminUser.email);

  // 2. Departments
  const departments = [
    'Spinning',
    'Weaving',
    'Dyeing & Bleaching',
    'Printing',
    'Cutting',
    'Stitching / Sewing',
    'Finishing & Packing',
    'Quality Control',
    'Maintenance',
    'Human Resources',
    'Finance & Accounts',
    'Administration',
  ];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Departments seeded.');

  // 3. Designations
  const designations = [
    'General Manager',
    'Factory Manager',
    'HR Executive',
    'Accountant',
    'Production Supervisor',
    'Quality Inspector',
    'Cutting Master',
    'Sewing Operator',
    'Overlock Operator',
    'Ironing & Packing Staff',
    'Maintenance Technician',
    'Electrician',
    'Security Guard',
    'Driver',
  ];
  for (const name of designations) {
    await prisma.designation.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Designations seeded.');

  // 4. Machinery (Textile Operations)
  const machineries = [
    { name: 'Cutting Machine', code: 'CUT-01', description: 'Fabric cutting machine' },
    { name: 'Stitching Machine', code: 'STITCH-01', description: 'Single/Double needle lockstitch' },
    { name: 'Overlock Machine', code: 'OVR-01', description: '3/4/5 thread overlock sewing machine' },
    { name: 'Flatlock Machine', code: 'FLAT-01', description: 'Interlock / flatlock sewing machine' },
    { name: 'Printing Machine', code: 'PRNT-01', description: 'Textile screen & sublimation rotary printer' },
    { name: 'Button Hole Machine', code: 'BTN-01', description: 'Automatic button hole & button attaching' },
    { name: 'Ironing & Steam Press', code: 'PRESS-01', description: 'Industrial steam ironing station' },
    { name: 'Packing & Sealing Machine', code: 'PACK-01', description: 'Carton and polybag sealing machine' },
    { name: 'Embroidery Machine', code: 'EMB-01', description: 'Multi-head computerized embroidery' },
    { name: 'Knitting Machine', code: 'KNIT-01', description: 'Circular knitting machine' },
  ];
  for (const m of machineries) {
    await prisma.machinery.upsert({
      where: { name: m.name },
      update: { code: m.code, description: m.description },
      create: m,
    });
  }
  console.log('Machinery catalog seeded.');

  // 5. Default Shifts
  const shifts = [
    {
      name: 'General Shift',
      code: 'GS',
      startTime: '08:30',
      endTime: '17:30',
      breakDuration: 60,
      gracePeriod: 15,
      weeklyOff: 'SUNDAY',
      isNightShift: false,
    },
    {
      name: 'Morning Shift (Shift 1)',
      code: 'MS1',
      startTime: '06:00',
      endTime: '14:00',
      breakDuration: 30,
      gracePeriod: 10,
      weeklyOff: 'SUNDAY',
      isNightShift: false,
    },
    {
      name: 'Evening Shift (Shift 2)',
      code: 'ES2',
      startTime: '14:00',
      endTime: '22:00',
      breakDuration: 30,
      gracePeriod: 10,
      weeklyOff: 'SUNDAY',
      isNightShift: false,
    },
    {
      name: 'Night Shift (Shift 3)',
      code: 'NS3',
      startTime: '22:00',
      endTime: '06:00',
      breakDuration: 30,
      gracePeriod: 10,
      weeklyOff: 'SUNDAY',
      isNightShift: true,
    },
  ];
  for (const s of shifts) {
    await prisma.shift.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
  }
  console.log('Shifts seeded.');

  // 6. Default Salary Components
  const salaryComponents = [
    // Earnings
    {
      name: 'Basic Salary',
      code: 'BASIC',
      type: ComponentType.EARNING,
      calculationType: CalculationType.PERCENTAGE_OF_GROSS,
      frequency: ComponentFrequency.MONTHLY,
      defaultPercent: 50,
      isStatutory: true,
      displayOrder: 1,
    },
    {
      name: 'Dearness Allowance (DA)',
      code: 'DA',
      type: ComponentType.EARNING,
      calculationType: CalculationType.PERCENTAGE_OF_BASIC,
      frequency: ComponentFrequency.MONTHLY,
      defaultPercent: 10,
      isStatutory: false,
      displayOrder: 2,
    },
    {
      name: 'House Rent Allowance (HRA)',
      code: 'HRA',
      type: ComponentType.EARNING,
      calculationType: CalculationType.PERCENTAGE_OF_GROSS,
      frequency: ComponentFrequency.MONTHLY,
      defaultPercent: 30,
      isStatutory: false,
      displayOrder: 3,
    },
    {
      name: 'Conveyance Allowance',
      code: 'CONVEYANCE',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 800,
      isStatutory: false,
      displayOrder: 4,
    },
    {
      name: 'Medical Allowance',
      code: 'MEDICAL',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 500,
      isStatutory: false,
      displayOrder: 5,
    },
    {
      name: 'Food Allowance',
      code: 'FOOD',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 1000,
      isStatutory: false,
      displayOrder: 6,
    },
    {
      name: 'Attendance Bonus',
      code: 'ATTN_BONUS',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.ATTENDANCE_BASED,
      defaultAmount: 500,
      isStatutory: false,
      isVariable: true,
      displayOrder: 7,
    },
    {
      name: 'Overtime Rate / Amount',
      code: 'OVERTIME',
      type: ComponentType.EARNING,
      calculationType: CalculationType.PER_HOUR,
      frequency: ComponentFrequency.ATTENDANCE_BASED,
      defaultAmount: 80,
      isStatutory: false,
      isVariable: true,
      displayOrder: 8,
    },
    {
      name: 'Bus Fare / Travel Allowance',
      code: 'BUS_FARE',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 500,
      isStatutory: false,
      displayOrder: 9,
    },
    {
      name: 'Other Allowances',
      code: 'OTHER_ALLOWANCE',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 0,
      isStatutory: false,
      displayOrder: 10,
    },
    // Deductions
    {
      name: 'Provident Fund (PF)',
      code: 'PF',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.PERCENTAGE_OF_BASIC,
      frequency: ComponentFrequency.MONTHLY,
      defaultPercent: 12,
      isStatutory: true,
      displayOrder: 11,
    },
    {
      name: 'Employee State Insurance (ESI)',
      code: 'ESI',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.PERCENTAGE_OF_GROSS,
      frequency: ComponentFrequency.MONTHLY,
      defaultPercent: 0.75,
      isStatutory: true,
      displayOrder: 12,
    },
    {
      name: 'Loan Deduction',
      code: 'LOAN_EMI',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 0,
      isStatutory: false,
      isVariable: true,
      displayOrder: 13,
    },
    {
      name: 'Advance Deduction',
      code: 'ADVANCE',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 0,
      isStatutory: false,
      isVariable: true,
      displayOrder: 14,
    },
    {
      name: 'Tax Deducted at Source (TDS)',
      code: 'TDS',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 0,
      isStatutory: true,
      displayOrder: 15,
    },
    {
      name: 'Professional Tax (PT)',
      code: 'PT',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 200,
      isStatutory: true,
      displayOrder: 16,
    },
    {
      name: 'Other Deductions',
      code: 'OTHER_DEDUCTION',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.FIXED,
      frequency: ComponentFrequency.MONTHLY,
      defaultAmount: 0,
      isStatutory: false,
      displayOrder: 17,
    },
  ];

  for (const comp of salaryComponents) {
    await prisma.salaryComponent.upsert({
      where: { code: comp.code },
      update: comp,
      create: comp,
    });
  }
  console.log('Salary components seeded.');

  // 7. Statutory Settings
  const existingStatutory = await prisma.statutorySettings.findFirst();
  if (!existingStatutory) {
    await prisma.statutorySettings.create({
      data: {
        pfEnabled: true,
        pfEmployeeRate: 12,
        pfEmployerRate: 12,
        pfWageLimit: 15000,
        pfAdminCharges: 0.5,
        pfEdliCharges: 0.5,
        esiEnabled: true,
        esiEmployeeRate: 0.75,
        esiEmployerRate: 3.25,
        esiWageLimit: 21000,
        esiDailyWageThreshold: 176,
        ptEnabled: true,
        ptAmount: 200,
        basicRate: 50,
        hraRate: 30,
        travelAllowanceRate: 5,
        otherAllowanceRate: 15,
        clLapseMonths: 3,
      },
    });
    console.log('Statutory settings created.');
  }

  // 8. Leave Types
  const leaveTypes = [
    { name: 'Casual Leave (CL)', code: 'CL', maxPerYear: 12, carryForward: false },
    { name: 'Sick Leave (SL)', code: 'SL', maxPerYear: 7, carryForward: false },
    { name: 'Earned Leave / Leave with Wages (EL)', code: 'EL', maxPerYear: 15, carryForward: true },
    { name: 'Loss of Pay (LOP)', code: 'LOP', maxPerYear: 365, carryForward: false },
    { name: 'Festival Holiday (FH)', code: 'FH', maxPerYear: 10, carryForward: false },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: lt,
      create: lt,
    });
  }
  console.log('Leave types seeded.');

  // 9. Sample Employees (Textile Mill)
  const defaultShift = await prisma.shift.findUnique({ where: { code: 'GS' } });
  const stitchingMachinery = await prisma.machinery.findUnique({ where: { name: 'Stitching Machine' } });
  const overlockMachinery = await prisma.machinery.findUnique({ where: { name: 'Overlock Machine' } });

  const sampleStaff1 = await prisma.staff.upsert({
    where: { employeeId: 'EMP001' },
    update: {},
    create: {
      employeeId: 'EMP001',
      registrationNumber: 'REG-TX-0101',
      name: 'R. Murugan',
      email: 'murugan@textile.com',
      phone: '9840112233',
      designation: 'Sewing Operator',
      department: 'Stitching / Sewing',
      educationalQualification: 'ITI / Diploma in Garment Making',
      yearsOfExperience: 5,
      previousCompany: 'Sri Lakshmi Mills',
      category: StaffCategory.PRODUCTION_OPERATOR,
      joiningDate: new Date('2023-01-15'),
      salary: 18500,
      paymentMode: 'BANK_TRANSFER',
      bankName: 'State Bank of India',
      bankAccountNo: '30987654321',
      bankIfsc: 'SBIN0001234',
      bankBranch: 'Tirupur Main',
      doorNo: '12/4',
      street: 'Mill Road',
      area: 'Avinashi',
      district: 'Tirupur',
      state: 'Tamil Nadu',
      pincode: '641602',
    },
  });

  // Link Machinery
  if (stitchingMachinery) {
    await prisma.staffMachinery.upsert({
      where: { staffId_machineryId: { staffId: sampleStaff1.id, machineryId: stitchingMachinery.id } },
      update: {},
      create: { staffId: sampleStaff1.id, machineryId: stitchingMachinery.id },
    });
  }
  if (overlockMachinery) {
    await prisma.staffMachinery.upsert({
      where: { staffId_machineryId: { staffId: sampleStaff1.id, machineryId: overlockMachinery.id } },
      update: {},
      create: { staffId: sampleStaff1.id, machineryId: overlockMachinery.id },
    });
  }

  // Link Shift Assignment
  if (defaultShift) {
    const existingAssignment = await prisma.employeeShiftAssignment.findFirst({
      where: { staffId: sampleStaff1.id, shiftId: defaultShift.id, isCurrent: true },
    });
    if (!existingAssignment) {
      await prisma.employeeShiftAssignment.create({
        data: {
          staffId: sampleStaff1.id,
          shiftId: defaultShift.id,
          effectiveFrom: new Date('2023-01-15'),
          isCurrent: true,
        },
      });
    }
  }

  // Link Statutory details
  await prisma.staffStatutory.upsert({
    where: { staffId: sampleStaff1.id },
    update: {},
    create: {
      staffId: sampleStaff1.id,
      pfNumber: 'TN/TPR/12345/001',
      uanNumber: '100987654321',
      esiNumber: '51000987654321',
      basicSalary: 9250,
      grossSalary: 18500,
      pfEnabled: true,
      esiEnabled: true,
      psfEnabled: false,
    },
  });

  // Sample Staff 2
  const sampleStaff2 = await prisma.staff.upsert({
    where: { employeeId: 'EMP002' },
    update: {},
    create: {
      employeeId: 'EMP002',
      registrationNumber: 'REG-TX-0102',
      name: 'K. Selvi',
      email: 'selvi@textile.com',
      phone: '9840223344',
      designation: 'Quality Inspector',
      department: 'Quality Control',
      educationalQualification: 'B.Sc Textile Science',
      yearsOfExperience: 3,
      previousCompany: 'Classic Polo Garments',
      category: StaffCategory.PRODUCTION_SUPERVISOR,
      joiningDate: new Date('2023-06-01'),
      salary: 22000,
      paymentMode: 'BANK_TRANSFER',
      bankName: 'Canara Bank',
      bankAccountNo: '112233445566',
      bankIfsc: 'CNRB0005678',
      bankBranch: 'PN Road, Tirupur',
    },
  });

  if (defaultShift) {
    const existingAssignment2 = await prisma.employeeShiftAssignment.findFirst({
      where: { staffId: sampleStaff2.id, shiftId: defaultShift.id, isCurrent: true },
    });
    if (!existingAssignment2) {
      await prisma.employeeShiftAssignment.create({
        data: {
          staffId: sampleStaff2.id,
          shiftId: defaultShift.id,
          effectiveFrom: new Date('2023-06-01'),
          isCurrent: true,
        },
      });
    }
  }

  await prisma.staffStatutory.upsert({
    where: { staffId: sampleStaff2.id },
    update: {},
    create: {
      staffId: sampleStaff2.id,
      pfNumber: 'TN/TPR/12345/002',
      uanNumber: '100987654322',
      esiNumber: '51000987654322',
      basicSalary: 11000,
      grossSalary: 22000,
      pfEnabled: true,
      esiEnabled: true,
      psfEnabled: false,
    },
  });

  console.log('Sample textile staff seeded successfully.');
  console.log('All seed operations completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
