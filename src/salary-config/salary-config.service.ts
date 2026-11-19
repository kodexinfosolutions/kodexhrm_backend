import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComponentDto, UpdateComponentDto, SaveEmployeeStructureDto, PreviewCalculationDto } from './dto/salary-config.dto';
import { ComponentType, CalculationType } from '@prisma/client';

@Injectable()
export class SalaryConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SALARY COMPONENTS ─────────────────────────────────

  async getAllComponents() {
    return this.prisma.salaryComponent.findMany({
      orderBy: [{ type: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createComponent(dto: CreateComponentDto) {
    const existing = await this.prisma.salaryComponent.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Component with code ${dto.code} already exists`);
    }

    return this.prisma.salaryComponent.create({
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase(),
      },
    });
  }

  async updateComponent(id: string, dto: UpdateComponentDto) {
    const existing = await this.prisma.salaryComponent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Component not found');

    return this.prisma.salaryComponent.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase(),
      },
    });
  }

  async deleteComponent(id: string) {
    const existing = await this.prisma.salaryComponent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Component not found');

    // Soft delete / deactivate
    return this.prisma.salaryComponent.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── EMPLOYEE SALARY STRUCTURE ─────────────────────────

  async getEmployeeStructure(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        staffStatutory: true,
        salaryStructures: {
          where: { isCurrent: true },
          include: { component: true },
          orderBy: { component: { displayOrder: 'asc' } },
        },
      },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const history = await this.prisma.employeeSalaryStructure.findMany({
      where: { staffId },
      include: { component: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    return {
      staff: {
        id: staff.id,
        employeeId: staff.employeeId,
        name: staff.name,
        department: staff.department,
        designation: staff.designation,
        salary: staff.salary,
        grossSalary: staff.staffStatutory?.grossSalary ?? staff.salary,
        basicSalary: staff.staffStatutory?.basicSalary,
        pfEnabled: staff.staffStatutory?.pfEnabled,
        esiEnabled: staff.staffStatutory?.esiEnabled,
      },
      currentStructure: staff.salaryStructures,
      history,
    };
  }

  async saveEmployeeStructure(staffId: string, dto: SaveEmployeeStructureDto) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const effectiveFromDate = new Date(dto.effectiveFrom);

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark previous current structures as false
      await tx.employeeSalaryStructure.updateMany({
        where: { staffId, isCurrent: true },
        data: {
          isCurrent: false,
          effectiveTo: effectiveFromDate,
        },
      });

      // 2. Insert new structure items
      const createdItems: any[] = [];
      let basicAmount = 0;

      for (const item of dto.items) {
        const comp = await tx.salaryComponent.findUnique({ where: { id: item.componentId } });
        if (!comp) continue;

        if (comp.code === 'BASIC') {
          basicAmount = item.amount;
        }

        const created = await tx.employeeSalaryStructure.create({
          data: {
            staffId,
            componentId: item.componentId,
            calculationType: item.calculationType,
            amount: item.amount,
            percentage: item.percentage ?? 0,
            effectiveFrom: effectiveFromDate,
            isCurrent: true,
          },
          include: { component: true },
        });
        createdItems.push(created);
      }

      // 3. Update staff gross salary and statutory records
      await tx.staff.update({
        where: { id: staffId },
        data: { salary: dto.grossSalary },
      });

      await tx.staffStatutory.upsert({
        where: { staffId },
        update: {
          grossSalary: dto.grossSalary,
          basicSalary: basicAmount > 0 ? basicAmount : Math.round(dto.grossSalary * 0.5),
        },
        create: {
          staffId,
          grossSalary: dto.grossSalary,
          basicSalary: basicAmount > 0 ? basicAmount : Math.round(dto.grossSalary * 0.5),
          pfEnabled: true,
          esiEnabled: true,
        },
      });

      return {
        staffId,
        grossSalary: dto.grossSalary,
        effectiveFrom: dto.effectiveFrom,
        items: createdItems,
      };
    });
  }

  /**
   * Preview calculation of earnings, deductions, gross and net
   */
  async calculatePreview(dto: PreviewCalculationDto) {
    const components = await this.prisma.salaryComponent.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    const compMap = new Map(components.map((c) => [c.id, c]));

    let calculatedBasic = 0;
    const gross = dto.grossSalary || 0;

    // First pass to determine Basic
    for (const item of dto.items) {
      const comp = compMap.get(item.componentId);
      if (comp?.code === 'BASIC') {
        if (item.calculationType === CalculationType.FIXED) {
          calculatedBasic = item.amount;
        } else if (item.calculationType === CalculationType.PERCENTAGE_OF_GROSS) {
          calculatedBasic = Math.round((gross * (item.percentage || 50)) / 100);
        }
        break;
      }
    }
    if (!calculatedBasic) calculatedBasic = Math.round(gross * 0.5);

    let totalEarnings = 0;
    let totalDeductions = 0;
    const earningsList: any[] = [];
    const deductionsList: any[] = [];

    for (const item of dto.items) {
      const comp = compMap.get(item.componentId);
      if (!comp) continue;

      let amount = item.amount || 0;
      if (item.calculationType === CalculationType.PERCENTAGE_OF_BASIC) {
        amount = Math.round((calculatedBasic * (item.percentage || 0)) / 100);
      } else if (item.calculationType === CalculationType.PERCENTAGE_OF_GROSS) {
        amount = Math.round((gross * (item.percentage || 0)) / 100);
      }

      const itemDetail = {
        componentId: comp.id,
        code: comp.code,
        name: comp.name,
        type: comp.type,
        calculationType: item.calculationType,
        percentage: item.percentage,
        amount,
      };

      if (comp.type === ComponentType.EARNING) {
        totalEarnings += amount;
        earningsList.push(itemDetail);
      } else {
        totalDeductions += amount;
        deductionsList.push(itemDetail);
      }
    }

    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    const netPayRounded = Math.round(netSalary);

    return {
      grossSalary: gross,
      totalEarnings,
      totalDeductions,
      netSalary,
      netPayRounded,
      earnings: earningsList,
      deductions: deductionsList,
    };
  }
}
