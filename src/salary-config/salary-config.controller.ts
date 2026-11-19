import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SalaryConfigService } from './salary-config.service';
import { CreateComponentDto, UpdateComponentDto, SaveEmployeeStructureDto, PreviewCalculationDto } from './dto/salary-config.dto';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permission.enum';

@Controller('salary-config')
export class SalaryConfigController {
  constructor(private readonly salaryConfigService: SalaryConfigService) {}

  @Get('components')
  @Permissions(Permission.SALARY_CONFIG_READ)
  getAllComponents() {
    return this.salaryConfigService.getAllComponents();
  }

  @Post('components')
  @Permissions(Permission.SALARY_CONFIG_MANAGE)
  createComponent(@Body() dto: CreateComponentDto) {
    return this.salaryConfigService.createComponent(dto);
  }

  @Put('components/:id')
  @Permissions(Permission.SALARY_CONFIG_MANAGE)
  updateComponent(@Param('id') id: string, @Body() dto: UpdateComponentDto) {
    return this.salaryConfigService.updateComponent(id, dto);
  }

  @Delete('components/:id')
  @Permissions(Permission.SALARY_CONFIG_MANAGE)
  deleteComponent(@Param('id') id: string) {
    return this.salaryConfigService.deleteComponent(id);
  }

  @Get('structure/:staffId')
  @Permissions(Permission.SALARY_CONFIG_READ)
  getEmployeeStructure(@Param('staffId') staffId: string) {
    return this.salaryConfigService.getEmployeeStructure(staffId);
  }

  @Post('structure/:staffId')
  @Permissions(Permission.SALARY_CONFIG_MANAGE)
  saveEmployeeStructure(
    @Param('staffId') staffId: string,
    @Body() dto: SaveEmployeeStructureDto,
  ) {
    return this.salaryConfigService.saveEmployeeStructure(staffId, dto);
  }

  @Post('calculate-preview')
  @Permissions(Permission.SALARY_CONFIG_READ)
  calculatePreview(@Body() dto: PreviewCalculationDto) {
    return this.salaryConfigService.calculatePreview(dto);
  }
}

