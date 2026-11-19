import { Module } from '@nestjs/common';
import { SalaryConfigController } from './salary-config.controller';
import { SalaryConfigService } from './salary-config.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SalaryConfigController],
  providers: [SalaryConfigService, PrismaService],
  exports: [SalaryConfigService],
})
export class SalaryConfigModule {}

