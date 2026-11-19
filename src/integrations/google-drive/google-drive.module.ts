import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { GoogleDriveController } from './google-drive.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GoogleDriveController],
  providers: [GoogleDriveService, PrismaService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
