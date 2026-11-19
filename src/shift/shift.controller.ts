import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ShiftService } from './shift.service';
import { CreateShiftDto, UpdateShiftDto, AssignShiftDto, BulkAssignShiftDto } from './dto/shift.dto';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permission.enum';

@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get()
  @Permissions(Permission.SHIFT_READ)
  findAll() {
    return this.shiftService.findAll();
  }

  @Get('roster')
  @Permissions(Permission.SHIFT_READ)
  getRoster(@Query('month') month?: string) {
    return this.shiftService.getRoster(month);
  }

  @Get('employee/:staffId')
  @Permissions(Permission.SHIFT_READ)
  getEmployeeShiftHistory(@Param('staffId') staffId: string) {
    return this.shiftService.getEmployeeShiftHistory(staffId);
  }

  @Get(':id')
  @Permissions(Permission.SHIFT_READ)
  findOne(@Param('id') id: string) {
    return this.shiftService.findOne(id);
  }

  @Post()
  @Permissions(Permission.SHIFT_MANAGE)
  create(@Body() dto: CreateShiftDto) {
    return this.shiftService.create(dto);
  }

  @Put(':id')
  @Permissions(Permission.SHIFT_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.shiftService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.SHIFT_MANAGE)
  remove(@Param('id') id: string) {
    return this.shiftService.remove(id);
  }

  @Post('assign')
  @Permissions(Permission.SHIFT_MANAGE)
  assignShift(@Body() dto: AssignShiftDto) {
    return this.shiftService.assignShift(dto);
  }

  @Post('assign/bulk')
  @Permissions(Permission.SHIFT_MANAGE)
  bulkAssignShift(@Body() dto: BulkAssignShiftDto) {
    return this.shiftService.bulkAssignShift(dto);
  }
}

