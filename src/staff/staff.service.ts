import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { CreateStaffDocumentDto } from './dto/staff-document.dto';
import { GoogleDriveService } from '../integrations/google-drive/google-drive.service';

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    @Optional() private googleDriveService?: GoogleDriveService,
  ) {}

  private sanitizePerDaySalary(value?: number) {
    if (value === undefined || value === null) return undefined;
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      throw new BadRequestException('perDaySalary must be a positive number');
    }
    return Number(normalized.toFixed(2));
  }

  private withPerDaySalary<
    T extends { staffStatutory?: { dailyRate?: number | null } | null },
  >(staff: T) {
    return {
      ...staff,
      perDaySalary: staff.staffStatutory?.dailyRate ?? null,
    };
  }

  private getLeaveEntitlementByCategory(
    leaveCode: string,
    category: Role | string | undefined,
    fallback: number,
  ) {
    const policy: Record<string, number> = {
      CL: 12,
      SL: 10,
      EL: 15,
      ML: 180,
      PL: 15,
      LOP: 999,
      FH: 10,
    };
    return policy[leaveCode] ?? fallback;
  }

  private getAcademicYearForDate(date: Date): string {
    const month = date.getMonth();
    const year = date.getFullYear();
    return month >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  private resolveStaffUserRole(role?: Role) {
    if (!role || role === Role.STAFF) {
      return Role.STAFF;
    }
    if (role === Role.HR_MANAGER) {
      return Role.HR_MANAGER;
    }
    return Role.STAFF;
  }

  private async generateEmployeeId(
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const staffMembers = await client.staff.findMany({
      select: { employeeId: true },
      orderBy: { createdAt: 'desc' },
    });

    const maxSequence = staffMembers.reduce((maxValue, staff) => {
      const match = staff.employeeId.match(/(\d+)(?!.*\d)/);
      if (!match) return maxValue;
      return Math.max(maxValue, parseInt(match[1], 10));
    }, 0);

    return `EMP${String(maxSequence + 1).padStart(4, '0')}`;
  }

  private handleStaffWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : String(error.meta?.target || 'staff record');

      if (target.includes('employeeId')) {
        throw new ConflictException('Employee ID already exists');
      }

      if (target.includes('email')) {
        throw new ConflictException(
          'A staff record with this email already exists',
        );
      }

      throw new ConflictException('A duplicate staff record already exists');
    }

    throw error;
  }

  async getNextEmployeeId() {
    return { employeeId: await this.generateEmployeeId() };
  }

  async autoAddMaster(type: 'department' | 'designation', name: string) {
    if (!name || name.trim() === '') return;
    const cleanName = name.trim();
    if (type === 'department') {
      const exists = await this.prisma.department.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } },
      });
      if (!exists)
        await this.prisma.department.create({ data: { name: cleanName } });
    } else {
      const exists = await this.prisma.designation.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } },
      });
      if (!exists)
        await this.prisma.designation.create({ data: { name: cleanName } });
    }
  }

  async create(data: CreateStaffDto) {
    await this.autoAddMaster('designation', data.designation);
    if (data.department) {
      await this.autoAddMaster('department', data.department);
    }
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 10)
      : undefined;
    const isActive = data.isActive ?? true;
    const userRole = this.resolveStaffUserRole(data.role);
    const perDaySalary = this.sanitizePerDaySalary(data.perDaySalary);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const employeeId =
          data.employeeId?.trim() || (await this.generateEmployeeId(tx));

        const staff = await tx.staff.create({
          data: {
            employeeId,
            registrationNumber: data.registrationNumber,
            name: data.name,
            email: data.email || null,
            phone: data.phone,
            alternatePhone: data.alternatePhone,
            designation: data.designation,
            department: data.department,
            educationalQualification: data.educationalQualification,
            otherQualifications: data.otherQualifications,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
            relievingDate: data.relievingDate
              ? new Date(data.relievingDate)
              : null,
            salary: data.salary,
            isActive,
            category: (data.category as any) || 'NON_TEACHING_REGULAR',
            paymentMode: data.paymentMode,
            bankName: data.bankName,
            bankAccountNo: data.bankAccountNo,
            bankIfsc: data.bankIfsc,
            bankBranch: data.bankBranch,
            pfJoiningDate: data.pfJoiningDate
              ? new Date(data.pfJoiningDate)
              : null,
            ugDegree: data.ugDegree,
            pgDegree: data.pgDegree,
            bEdStatus: data.bEdStatus ?? false,
            certificatesCollected: data.certificatesCollected ?? false,
            previousCompany: data.previousCompany,
            previousSchoolName: data.previousSchoolName,
            previousStandardsHandled: data.previousStandardsHandled,
            previousSubjectsHandled: data.previousSubjectsHandled,
            yearsOfExperience: data.yearsOfExperience,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            maritalStatus: data.maritalStatus,
            numberOfChildren: data.numberOfChildren ?? 0,
            doorNo: data.doorNo,
            street: data.street,
            area: data.area,
            taluk: data.taluk,
            district: data.district,
            state: data.state,
            pincode: data.pincode,
          },
        });

        // Machinery Links
        if (data.machineryIds && data.machineryIds.length > 0) {
          for (const machineryId of data.machineryIds) {
            await tx.staffMachinery.create({
              data: {
                staffId: staff.id,
                machineryId,
              },
            });
          }
        }

        // Shift Assignment
        if (data.shiftId) {
          await tx.employeeShiftAssignment.create({
            data: {
              staffId: staff.id,
              shiftId: data.shiftId,
              effectiveFrom: data.joiningDate ? new Date(data.joiningDate) : new Date(),
              isCurrent: true,
            },
          });
        }

        // Create User account if email and password provided
        if (data.email && hashedPassword) {
          await tx.user.create({
            data: {
              name: data.name,
              email: data.email,
              password: hashedPassword,
              role: userRole,
              staffId: staff.id,
              isActive,
            },
          });
        }

        // Create Statutory details
        await tx.staffStatutory.upsert({
          where: { staffId: staff.id },
          update: {
            basicSalary: data.salary ? Math.round(data.salary * 0.5) : undefined,
            grossSalary: data.salary ?? undefined,
            uanNumber: data.uanNumber,
            pfNumber: data.pfNumber,
            esiNumber: data.esiNumber,
            ...(data.pfEnabled !== undefined ? { pfEnabled: Boolean(data.pfEnabled) } : {}),
            ...(data.esiEnabled !== undefined ? { esiEnabled: Boolean(data.esiEnabled) } : {}),
            ...(perDaySalary !== undefined ? { dailyRate: perDaySalary } : {}),
          },
          create: {
            staffId: staff.id,
            basicSalary: data.salary ? Math.round(data.salary * 0.5) : undefined,
            grossSalary: data.salary ?? undefined,
            uanNumber: data.uanNumber,
            pfNumber: data.pfNumber,
            esiNumber: data.esiNumber,
            pfEnabled: data.pfEnabled !== undefined ? Boolean(data.pfEnabled) : true,
            esiEnabled: data.esiEnabled !== undefined ? Boolean(data.esiEnabled) : true,
            ...(perDaySalary !== undefined ? { dailyRate: perDaySalary } : {}),
          },
        });

        // Initialize Leave Balances
        const currentAcademicYear = this.getAcademicYearForDate(new Date());
        const activeLeaveTypes = await tx.leaveType.findMany({
          where: { isActive: true },
          select: { id: true, code: true, maxPerYear: true },
        });

        if (activeLeaveTypes.length > 0) {
          const staffCategory = (data.category as string) || 'NON_TEACHING_REGULAR';
          await tx.leaveBalance.createMany({
            data: activeLeaveTypes.map((leaveType) => ({
              staffId: staff.id,
              leaveTypeId: leaveType.id,
              year: currentAcademicYear,
              total: this.getLeaveEntitlementByCategory(
                leaveType.code,
                staffCategory,
                leaveType.maxPerYear,
              ),
              used: 0,
              remaining: this.getLeaveEntitlementByCategory(
                leaveType.code,
                staffCategory,
                leaveType.maxPerYear,
              ),
            })),
            skipDuplicates: true,
          });
        }

        const refreshed = await tx.staff.findUniqueOrThrow({
          where: { id: staff.id },
          include: {
            machineries: { include: { machinery: true } },
            shiftAssignments: { where: { isCurrent: true }, include: { shift: true } },
            staffStatutory: true,
          },
        });

        return this.withPerDaySalary(refreshed);
      });
    } catch (error) {
      this.handleStaffWriteError(error);
    }
  }

  async findAll(status?: string) {
    const whereClause: any = {};
    if (status === 'alumni') {
      whereClause.isActive = false;
    } else if (status === 'all') {
      // no filter
    } else {
      whereClause.isActive = true;
    }

    const rows = await this.prisma.staff.findMany({
      where: whereClause,
      include: {
        machineries: { include: { machinery: true } },
        shiftAssignments: { where: { isCurrent: true }, include: { shift: true } },
        staffStatutory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => this.withPerDaySalary(r));
  }

  async findOne(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        machineries: { include: { machinery: true } },
        shiftAssignments: { where: { isCurrent: true }, include: { shift: true } },
        staffStatutory: true,
        documents: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return this.withPerDaySalary(staff);
  }

  async update(id: string, data: CreateStaffDto) {
    const existing = await this.findOne(id);
    await this.autoAddMaster('designation', data.designation);
    if (data.department) {
      await this.autoAddMaster('department', data.department);
    }

    const perDaySalary = this.sanitizePerDaySalary(data.perDaySalary);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.staff.update({
          where: { id },
          data: {
            registrationNumber: data.registrationNumber,
            name: data.name,
            email: data.email || null,
            phone: data.phone,
            alternatePhone: data.alternatePhone,
            designation: data.designation,
            department: data.department,
            educationalQualification: data.educationalQualification,
            otherQualifications: data.otherQualifications,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
            relievingDate: data.relievingDate
              ? new Date(data.relievingDate)
              : null,
            salary: data.salary,
            isActive: data.isActive ?? existing.isActive,
            category: (data.category as any) || existing.category,
            paymentMode: data.paymentMode,
            bankName: data.bankName,
            bankAccountNo: data.bankAccountNo,
            bankIfsc: data.bankIfsc,
            bankBranch: data.bankBranch,
            pfJoiningDate: data.pfJoiningDate
              ? new Date(data.pfJoiningDate)
              : null,
            ugDegree: data.ugDegree,
            pgDegree: data.pgDegree,
            bEdStatus: data.bEdStatus ?? false,
            certificatesCollected: data.certificatesCollected ?? false,
            previousCompany: data.previousCompany,
            previousSchoolName: data.previousSchoolName,
            previousStandardsHandled: data.previousStandardsHandled,
            previousSubjectsHandled: data.previousSubjectsHandled,
            yearsOfExperience: data.yearsOfExperience,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            maritalStatus: data.maritalStatus,
            numberOfChildren: data.numberOfChildren ?? 0,
            doorNo: data.doorNo,
            street: data.street,
            area: data.area,
            taluk: data.taluk,
            district: data.district,
            state: data.state,
            pincode: data.pincode,
          },
        });

        // Update Machinery links
        if (data.machineryIds !== undefined) {
          await tx.staffMachinery.deleteMany({ where: { staffId: id } });
          for (const machineryId of data.machineryIds) {
            await tx.staffMachinery.create({
              data: {
                staffId: id,
                machineryId,
              },
            });
          }
        }

        // Update Shift if provided
        if (data.shiftId) {
          const currentShift = existing.shiftAssignments?.[0]?.shift?.id;
          if (currentShift !== data.shiftId) {
            await tx.employeeShiftAssignment.updateMany({
              where: { staffId: id, isCurrent: true },
              data: { isCurrent: false, effectiveTo: new Date() },
            });
            await tx.employeeShiftAssignment.create({
              data: {
                staffId: id,
                shiftId: data.shiftId,
                effectiveFrom: new Date(),
                isCurrent: true,
              },
            });
          }
        }

        // Update Statutory
        await tx.staffStatutory.upsert({
          where: { staffId: id },
          update: {
            basicSalary: data.salary ? Math.round(data.salary * 0.5) : undefined,
            grossSalary: data.salary ?? undefined,
            uanNumber: data.uanNumber,
            pfNumber: data.pfNumber,
            esiNumber: data.esiNumber,
            ...(data.pfEnabled !== undefined ? { pfEnabled: Boolean(data.pfEnabled) } : {}),
            ...(data.esiEnabled !== undefined ? { esiEnabled: Boolean(data.esiEnabled) } : {}),
            ...(perDaySalary !== undefined ? { dailyRate: perDaySalary } : {}),
          },
          create: {
            staffId: id,
            basicSalary: data.salary ? Math.round(data.salary * 0.5) : undefined,
            grossSalary: data.salary ?? undefined,
            uanNumber: data.uanNumber,
            pfNumber: data.pfNumber,
            esiNumber: data.esiNumber,
            pfEnabled: data.pfEnabled !== undefined ? Boolean(data.pfEnabled) : true,
            esiEnabled: data.esiEnabled !== undefined ? Boolean(data.esiEnabled) : true,
            ...(perDaySalary !== undefined ? { dailyRate: perDaySalary } : {}),
          },
        });

        const refreshed = await tx.staff.findUniqueOrThrow({
          where: { id },
          include: {
            machineries: { include: { machinery: true } },
            shiftAssignments: { where: { isCurrent: true }, include: { shift: true } },
            staffStatutory: true,
          },
        });

        return this.withPerDaySalary(refreshed);
      });
    } catch (error) {
      this.handleStaffWriteError(error);
    }
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    return this.prisma.staff.update({
      where: { id },
      data: { isActive: false, relievingDate: new Date() },
    });
  }

  // ─── DOCUMENTS ──────────────────────────────────────────

  async addDocument(id: string, data: CreateStaffDocumentDto, file: Express.Multer.File) {
    await this.findOne(id);
    const doc = await this.prisma.staffDocument.create({
      data: {
        staffId: id,
        type: data.type || 'OTHER',
        title: data.title || file.originalname,
        fileName: file.filename,
        fileSize: file.size,
        url: file.path.replace(/\\/g, '/'),
        googleDriveSyncStatus: 'LOCAL',
      },
    });

    // Trigger Google Drive upload asynchronously (non-blocking)
    if (this.googleDriveService) {
      this.googleDriveService.uploadStaffDocument(doc.id).catch((err) => {
        console.error(`Google Drive upload failed for document ${doc.id}:`, err);
      });
    }

    return doc;
  }

  async listDocuments(id: string, type?: string) {
    await this.findOne(id);
    return this.prisma.staffDocument.findMany({
      where: {
        staffId: id,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeDocument(id: string, documentId: string, force = false) {
    const doc = await this.prisma.staffDocument.findFirst({
      where: { id: documentId, staffId: id },
    });
    if (!doc) throw new NotFoundException('Document not found');

    let driveTrashWarning: string | null = null;

    // 1. If synchronized to Google Drive (has googleDriveFileId), move file to Trash in Google Drive
    if (doc.googleDriveFileId && this.googleDriveService) {
      const trashResult = await this.googleDriveService.trashDriveFile(doc.googleDriveFileId);
      if (!trashResult.success) {
        if (!force) {
          // If not force, record error on document and throw error so client is aware and can retry or force
          await this.prisma.staffDocument.update({
            where: { id: doc.id },
            data: {
              googleDriveSyncStatus: 'FAILED',
              googleDriveError: `Failed to move file to Google Drive Trash: ${trashResult.error}`,
            },
          });
          throw new BadRequestException(
            `Could not delete document from Google Drive: ${trashResult.error}. Please retry, or force local deletion.`,
          );
        } else {
          driveTrashWarning = trashResult.error || 'Failed to move to Google Drive Trash';
        }
      }
    }

    // 2. Remove local file from disk if present
    if (existsSync(doc.url)) {
      try {
        unlinkSync(doc.url);
      } catch (err) {
        console.error('Error removing document file from disk:', err);
      }
    }

    // 3. Remove document from database
    const deleted = await this.prisma.staffDocument.delete({ where: { id: documentId } });

    return {
      ...deleted,
      driveTrashed: Boolean(doc.googleDriveFileId && !driveTrashWarning),
      driveWarning: driveTrashWarning,
    };
  }

  // ─── MASTERS: DEPARTMENTS & DESIGNATIONS ────────────────

  async getDepartments() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  async createDepartment(name: string) {
    return this.prisma.department.upsert({
      where: { name: name.trim() },
      update: {},
      create: { name: name.trim() },
    });
  }

  async deleteDepartment(id: string) {
    return this.prisma.department.delete({ where: { id } });
  }

  async getDesignations() {
    return this.prisma.designation.findMany({ orderBy: { name: 'asc' } });
  }

  async createDesignation(name: string) {
    return this.prisma.designation.upsert({
      where: { name: name.trim() },
      update: {},
      create: { name: name.trim() },
    });
  }

  async deleteDesignation(id: string) {
    return this.prisma.designation.delete({ where: { id } });
  }

  // ─── MASTERS: MACHINERY (TEXTILE OPERATIONS) ───────────

  async getMachineries() {
    return this.prisma.machinery.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { staffLinks: true },
        },
      },
    });
  }

  async createMachinery(data: { name: string; code?: string; description?: string }) {
    return this.prisma.machinery.upsert({
      where: { name: data.name.trim() },
      update: { code: data.code, description: data.description },
      create: {
        name: data.name.trim(),
        code: data.code?.trim().toUpperCase(),
        description: data.description,
      },
    });
  }

  async updateMachinery(id: string, data: { name: string; code?: string; description?: string; isActive?: boolean }) {
    return this.prisma.machinery.update({
      where: { id },
      data: {
        name: data.name.trim(),
        code: data.code?.trim().toUpperCase(),
        description: data.description,
        isActive: data.isActive,
      },
    });
  }

  async deleteMachinery(id: string) {
    return this.prisma.machinery.delete({ where: { id } });
  }
}
