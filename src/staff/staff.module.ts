import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleDriveModule } from '../integrations/google-drive/google-drive.module';

@Module({
  imports: [GoogleDriveModule],
  controllers: [StaffController],
  providers: [StaffService, PrismaService],
  exports: [StaffService],
})
export class StaffModule {}
