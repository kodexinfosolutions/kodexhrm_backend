import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBonusDto, UpdateBonusDto, ApproveBonusDto, RejectBonusDto, MarkPaidBonusDto, BulkPayBonusDto } from './dto/bonus.dto';
import { BonusApprovalStatus, PaymentStatus, CalculationType } from '@prisma/client';

@Injectable()
export class BonusService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    month?: string;
    staffId?: string;
    department?: string;
    approvalStatus?: BonusApprovalStatus;
    paymentStatus?: PaymentStatus;
    bonusType?: string;
  }) {
    const where: any = {};
    if (query.month) where.bonusMonth = query.month;
    if (query.staffId) where.staffId = query.staffId;
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.bonusType) where.bonusType = query.bonusType as any;
    if (query.department) {
      where.staff = { department: query.department };
    }

    return this.prisma.bonusRecord.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
            designation: true,
            salary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.bonusRecord.findUnique({
      where: { id },
      include: {
        staff: true,
      },
    });
    if (!record) throw new NotFoundException('Bonus record not found');
    return record;
  }

  async create(dto: CreateBonusDto, user?: any) {
    if (!dto.staffIds?.length) {
      throw new BadRequestException('At least one staff member must be selected');
    }

    const createdRecords: any[] = [];

    for (const staffId of dto.staffIds) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: staffId },
        include: { staffStatutory: true },
      });
      if (!staff) continue;

      let calculatedAmount = dto.amount;
      if (dto.calculationType === CalculationType.PERCENTAGE_OF_BASIC) {
        const basic = staff.staffStatutory?.basicSalary || (staff.salary ? staff.salary * 0.5 : 0);
        calculatedAmount = Math.round((basic * (dto.percentage || 0)) / 100);
      } else if (dto.calculationType === CalculationType.PERCENTAGE_OF_GROSS) {
        const gross = staff.staffStatutory?.grossSalary || staff.salary || 0;
        calculatedAmount = Math.round((gross * (dto.percentage || 0)) / 100);
      }

      // Check for duplicate bonus of same type in same month
      const duplicate = await this.prisma.bonusRecord.findFirst({
        where: {
          staffId,
          bonusMonth: dto.bonusMonth,
          bonusType: dto.bonusType,
          approvalStatus: { not: BonusApprovalStatus.REJECTED },
        },
      });

      if (duplicate) {
        // Skip duplicate or update
        continue;
      }

      const record = await this.prisma.bonusRecord.create({
        data: {
          staffId,
          bonusType: dto.bonusType,
          calculationType: dto.calculationType,
          amount: calculatedAmount,
          percentage: dto.percentage,
          bonusMonth: dto.bonusMonth,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
          description: dto.description,
          approvalStatus: dto.approvalStatus || BonusApprovalStatus.PENDING,
          paymentStatus: dto.paymentStatus || PaymentStatus.PENDING,
          paymentMode: dto.paymentMode,
          transactionRef: dto.transactionRef,
        },
        include: { staff: true },
      });
      createdRecords.push(record);
    }

    return {
      message: `${createdRecords.length} bonus records created successfully`,
      records: createdRecords,
    };
  }

  async update(id: string, dto: UpdateBonusDto) {
    const record = await this.findOne(id);
    if (record.approvalStatus === BonusApprovalStatus.APPROVED && record.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot edit an approved and paid bonus record');
    }

    return this.prisma.bonusRecord.update({
      where: { id },
      data: {
        bonusType: dto.bonusType,
        amount: dto.amount,
        bonusMonth: dto.bonusMonth,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        description: dto.description,
        paymentMode: dto.paymentMode,
        transactionRef: dto.transactionRef,
      },
    });
  }

  async approve(id: string, user?: any) {
    const record = await this.findOne(id);
    if (record.approvalStatus === BonusApprovalStatus.APPROVED) {
      throw new BadRequestException('Bonus is already approved');
    }

    return this.prisma.bonusRecord.update({
      where: { id },
      data: {
        approvalStatus: BonusApprovalStatus.APPROVED,
        approvedBy: user?.email || user?.name || 'Administrator',
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, dto: RejectBonusDto) {
    const record = await this.findOne(id);
    if (record.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot reject a paid bonus');
    }

    return this.prisma.bonusRecord.update({
      where: { id },
      data: {
        approvalStatus: BonusApprovalStatus.REJECTED,
        rejectionReason: dto.reason,
      },
    });
  }

  async markPaid(id: string, dto?: MarkPaidBonusDto) {
    const record = await this.findOne(id);
    return this.prisma.bonusRecord.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentMode: dto?.paymentMode || record.paymentMode || 'BANK_TRANSFER',
        transactionRef: dto?.transactionRef || record.transactionRef || undefined,
        paymentDate: dto?.paymentDate ? new Date(dto.paymentDate) : new Date(),
      },
    });
  }

  async bulkPay(dto: BulkPayBonusDto) {
    if (!dto.ids || dto.ids.length === 0) {
      throw new BadRequestException('No bonus IDs provided for bulk payment');
    }
    const result = await this.prisma.bonusRecord.updateMany({
      where: {
        id: { in: dto.ids },
        paymentStatus: { not: PaymentStatus.PAID },
      },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentMode: dto.paymentMode || 'BANK_TRANSFER',
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      },
    });
    return { count: result.count, message: `Successfully marked ${result.count} bonuses as paid` };
  }

  async remove(id: string) {
    const record = await this.findOne(id);
    if (record.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid bonus');
    }
    return this.prisma.bonusRecord.delete({ where: { id } });
  }

  // ─── BONUS REPORTS ─────────────────────────────────────

  async getReports(month?: string) {
    const where: any = {};
    if (month) where.bonusMonth = month;

    const allRecords = await this.prisma.bonusRecord.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    // 1. Summary Totals
    const totalBonusCreated = allRecords.reduce((sum, r) => sum + r.amount, 0);
    const approvedRecords = allRecords.filter((r) => r.approvalStatus === BonusApprovalStatus.APPROVED);
    const totalApprovedAmount = approvedRecords.reduce((sum, r) => sum + r.amount, 0);
    const paidRecords = allRecords.filter((r) => r.paymentStatus === PaymentStatus.PAID);
    const totalPaidAmount = paidRecords.reduce((sum, r) => sum + r.amount, 0);
    const pendingAmount = totalApprovedAmount - totalPaidAmount;

    // 2. Department-wise aggregation
    const deptMap: Record<string, { totalAmount: number; count: number; paidAmount: number }> = {};
    for (const r of allRecords) {
      const dept = r.staff?.department || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { totalAmount: 0, count: 0, paidAmount: 0 };
      deptMap[dept].totalAmount += r.amount;
      deptMap[dept].count += 1;
      if (r.paymentStatus === PaymentStatus.PAID) {
        deptMap[dept].paidAmount += r.amount;
      }
    }
    const departmentWise = Object.entries(deptMap).map(([department, data]) => ({
      department,
      ...data,
    }));

    // 3. Bonus Type Breakdown
    const typeMap: Record<string, number> = {};
    for (const r of allRecords) {
      typeMap[r.bonusType] = (typeMap[r.bonusType] || 0) + r.amount;
    }
    const typeBreakdown = Object.entries(typeMap).map(([bonusType, amount]) => ({
      bonusType,
      amount,
    }));

    // 4. Employee-wise report
    const employeeWise = allRecords.map((r) => ({
      id: r.id,
      employeeId: r.staff?.employeeId,
      name: r.staff?.name,
      department: r.staff?.department,
      bonusType: r.bonusType,
      amount: r.amount,
      bonusMonth: r.bonusMonth,
      approvalStatus: r.approvalStatus,
      paymentStatus: r.paymentStatus,
      paymentMode: r.paymentMode,
      paymentDate: r.paymentDate,
    }));

    return {
      summary: {
        totalBonusCreated,
        totalApprovedAmount,
        totalPaidAmount,
        pendingAmount,
        totalCount: allRecords.length,
        approvedCount: approvedRecords.length,
        paidCount: paidRecords.length,
      },
      departmentWise,
      typeBreakdown,
      employeeWise,
    };
  }
}
