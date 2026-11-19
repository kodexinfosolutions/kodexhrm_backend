import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { BonusService } from './bonus.service';
import { CreateBonusDto, UpdateBonusDto, RejectBonusDto, MarkPaidBonusDto, BulkPayBonusDto } from './dto/bonus.dto';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permission.enum';
import { BonusApprovalStatus, PaymentStatus } from '@prisma/client';

@Controller('bonus')
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Get()
  @Permissions(Permission.BONUS_READ)
  findAll(
    @Query('month') month?: string,
    @Query('staffId') staffId?: string,
    @Query('department') department?: string,
    @Query('approvalStatus') approvalStatus?: BonusApprovalStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('bonusType') bonusType?: string,
  ) {
    return this.bonusService.findAll({
      month,
      staffId,
      department,
      approvalStatus,
      paymentStatus,
      bonusType,
    });
  }

  @Get('reports')
  @Permissions(Permission.BONUS_READ)
  getReports(@Query('month') month?: string) {
    return this.bonusService.getReports(month);
  }

  @Get(':id')
  @Permissions(Permission.BONUS_READ)
  findOne(@Param('id') id: string) {
    return this.bonusService.findOne(id);
  }

  @Post()
  @Permissions(Permission.BONUS_MANAGE)
  create(@Body() dto: CreateBonusDto, @Req() req: any) {
    return this.bonusService.create(dto, req.user);
  }

  @Put('bulk-pay')
  @Permissions(Permission.BONUS_MANAGE)
  bulkPay(@Body() dto: BulkPayBonusDto) {
    return this.bonusService.bulkPay(dto);
  }

  @Put(':id')
  @Permissions(Permission.BONUS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateBonusDto) {
    return this.bonusService.update(id, dto);
  }

  @Put(':id/approve')
  @Permissions(Permission.BONUS_APPROVE)
  approve(@Param('id') id: string, @Req() req: any) {
    return this.bonusService.approve(id, req.user);
  }

  @Put(':id/reject')
  @Permissions(Permission.BONUS_APPROVE)
  reject(@Param('id') id: string, @Body() dto: RejectBonusDto) {
    return this.bonusService.reject(id, dto);
  }

  @Put(':id/pay')
  @Permissions(Permission.BONUS_MANAGE)
  markPaid(@Param('id') id: string, @Body() dto?: MarkPaidBonusDto) {
    return this.bonusService.markPaid(id, dto || {});
  }

  @Delete(':id')
  @Permissions(Permission.BONUS_MANAGE)
  remove(@Param('id') id: string) {
    return this.bonusService.remove(id);
  }
}

