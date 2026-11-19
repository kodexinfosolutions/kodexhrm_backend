import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto, UpdateShiftDto, AssignShiftDto, BulkAssignShiftDto } from './dto/shift.dto';

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shift.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { assignments: { where: { isCurrent: true } } },
        },
      },
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { isCurrent: true },
          include: {
            staff: {
              select: { id: true, name: true, employeeId: true, department: true, designation: true },
            },
          },
        },
      },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(dto: CreateShiftDto) {
    const existing = await this.prisma.shift.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) throw new ConflictException(`Shift with code ${dto.code} already exists`);

    return this.prisma.shift.create({
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase(),
        breakDuration: dto.breakDuration ?? 60,
        gracePeriod: dto.gracePeriod ?? 15,
        weeklyOff: dto.weeklyOff ?? 'SUNDAY',
        isNightShift: dto.isNightShift ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateShiftDto) {
    await this.findOne(id);
    return this.prisma.shift.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase(),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const assignedCount = await this.prisma.employeeShiftAssignment.count({
      where: { shiftId: id, isCurrent: true },
    });
    if (assignedCount > 0) {
      throw new BadRequestException('Cannot delete shift because employees are currently assigned to it');
    }
    return this.prisma.shift.delete({ where: { id } });
  }

  // ─── SHIFT ASSIGNMENT & HISTORY ─────────────────────────

  async assignShift(dto: AssignShiftDto) {
    const staff = await this.prisma.staff.findUnique({ where: { id: dto.staffId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const effectiveFromDate = new Date(dto.effectiveFrom);

    return this.prisma.$transaction(async (tx) => {
      // End previous current assignment
      await tx.employeeShiftAssignment.updateMany({
        where: { staffId: dto.staffId, isCurrent: true },
        data: {
          isCurrent: false,
          effectiveTo: effectiveFromDate,
        },
      });

      // Create new current assignment
      return tx.employeeShiftAssignment.create({
        data: {
          staffId: dto.staffId,
          shiftId: dto.shiftId,
          effectiveFrom: effectiveFromDate,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          isCurrent: true,
          notes: dto.notes,
        },
        include: {
          shift: true,
          staff: {
            select: { id: true, name: true, employeeId: true, department: true },
          },
        },
      });
    });
  }

  async bulkAssignShift(dto: BulkAssignShiftDto) {
    const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const effectiveFromDate = new Date(dto.effectiveFrom);
    const effectiveToDate = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const results: any[] = [];
    for (const staffId of dto.staffIds) {
      await this.prisma.employeeShiftAssignment.updateMany({
        where: { staffId, isCurrent: true },
        data: {
          isCurrent: false,
          effectiveTo: effectiveFromDate,
        },
      });

      const assignment = await this.prisma.employeeShiftAssignment.create({
        data: {
          staffId,
          shiftId: dto.shiftId,
          effectiveFrom: effectiveFromDate,
          effectiveTo: effectiveToDate,
          isCurrent: true,
          notes: dto.notes,
        },
      });
      results.push(assignment);
    }

    return { count: results.length, assignments: results };
  }

  async getEmployeeShiftHistory(staffId: string) {
    return this.prisma.employeeShiftAssignment.findMany({
      where: { staffId },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async getEmployeeExpectedShift(staffId: string, date: Date) {
    const targetDate = new Date(date);
    // Find active assignment for this specific date or current
    const assignment = await this.prisma.employeeShiftAssignment.findFirst({
      where: {
        staffId,
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
      },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (assignment) return assignment.shift;

    // Fallback: any current assignment
    const currentAssignment = await this.prisma.employeeShiftAssignment.findFirst({
      where: { staffId, isCurrent: true },
      include: { shift: true },
    });

    if (currentAssignment) return currentAssignment.shift;

    // Default General Shift
    return this.prisma.shift.findFirst({
      where: { code: 'GS' },
    });
  }

  async getRoster(month?: string) {
    return this.prisma.staff.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        designation: true,
        shiftAssignments: {
          where: { isCurrent: true },
          include: { shift: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Evaluates checkIn and checkOut against assigned shift
   */
  evaluateShiftAttendance(
    shift: {
      startTime: string;
      endTime: string;
      breakDuration: number;
      gracePeriod: number;
      isNightShift: boolean;
    },
    checkIn?: string,
    checkOut?: string,
  ) {
    if (!checkIn) {
      return {
        isLate: false,
        lateMinutes: 0,
        isEarlyOut: false,
        earlyMinutes: 0,
        workingHours: 0,
        overtimeHours: 0,
      };
    }

    const parseTimeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const shiftStartMin = parseTimeToMinutes(shift.startTime);
    let shiftEndMin = parseTimeToMinutes(shift.endTime);
    if (shift.isNightShift && shiftEndMin <= shiftStartMin) {
      shiftEndMin += 24 * 60; // next day
    }

    const expectedShiftDurationMin = shiftEndMin - shiftStartMin - shift.breakDuration;
    const expectedShiftHours = expectedShiftDurationMin / 60;

    const checkInMin = parseTimeToMinutes(checkIn);
    const graceLimitMin = shiftStartMin + (shift.gracePeriod || 0);

    let isLate = false;
    let lateMinutes = 0;
    if (checkInMin > graceLimitMin) {
      isLate = true;
      lateMinutes = checkInMin - shiftStartMin;
    }

    let isEarlyOut = false;
    let earlyMinutes = 0;
    let workingHours = 0;
    let overtimeHours = 0;

    if (checkOut) {
      let checkOutMin = parseTimeToMinutes(checkOut);
      if (shift.isNightShift && checkOutMin <= checkInMin) {
        checkOutMin += 24 * 60;
      }

      if (checkOutMin < shiftEndMin) {
        isEarlyOut = true;
        earlyMinutes = shiftEndMin - checkOutMin;
      }

      const totalPresenceMin = checkOutMin - checkInMin;
      const actualWorkedMin = Math.max(0, totalPresenceMin - shift.breakDuration);
      workingHours = Number((actualWorkedMin / 60).toFixed(2));

      if (workingHours > expectedShiftHours) {
        overtimeHours = Number((workingHours - expectedShiftHours).toFixed(2));
      }
    } else {
      // Only checked in
      workingHours = expectedShiftHours;
    }

    return {
      isLate,
      lateMinutes,
      isEarlyOut,
      earlyMinutes,
      workingHours,
      overtimeHours,
    };
  }
}
