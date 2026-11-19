import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import { ShiftModule } from './shift/shift.module';
import { SalaryConfigModule } from './salary-config/salary-config.module';
import { BonusModule } from './bonus/bonus.module';
import { HrModule } from './hr/hr.module';
import { SettingsModule } from './settings/settings.module';
import { GoogleDriveModule } from './integrations/google-drive/google-drive.module';
import { JwtAuthGuard } from './auth/jwt.guard';
import { PermissionsGuard } from './auth/permissions.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    StaffModule,
    ShiftModule,
    SalaryConfigModule,
    BonusModule,
    HrModule,
    SettingsModule,
    GoogleDriveModule,
  ],
  providers: [
    PrismaService,
    UserService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
