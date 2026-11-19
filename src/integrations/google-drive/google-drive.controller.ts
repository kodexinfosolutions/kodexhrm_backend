import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Delete,
} from '@nestjs/common';
import { Response } from 'express';
import { GoogleDriveService } from './google-drive.service';
import { Public } from '../../auth/public.decorator';
import { Permissions } from '../../auth/permissions.decorator';
import { Permission } from '../../auth/permission.enum';

@Controller('integrations/google-drive')
export class GoogleDriveController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}

  /**
   * 1. Initiate Google Drive OAuth connection
   * Redirects user to Google OAuth 2.0 consent screen
   */
  @Get('connect')
  @Permissions(Permission.SETTINGS_UPDATE)
  connect(@Res() res: Response) {
    const authUrl = this.googleDriveService.getAuthorizationUrl();
    return res.redirect(authUrl);
  }

  /**
   * Return authorization URL in JSON format (useful for SPAs opening in popup or redirecting)
   */
  @Get('auth-url')
  @Permissions(Permission.SETTINGS_UPDATE)
  getAuthUrl() {
    return {
      url: this.googleDriveService.getAuthorizationUrl(),
    };
  }

  /**
   * 2. OAuth Callback
   * Google redirects back here after admin consents:
   * http://localhost:3005/erp/api/integrations/google-drive/callback
   */
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5174';

    if (error) {
      return res.redirect(
        `${frontendBase}/erp/dashboard?page=admin-settings&gdrive_error=${encodeURIComponent(error)}`,
      );
    }

    try {
      const result = await this.googleDriveService.handleOAuthCallback(code);
      return res.redirect(
        `${frontendBase}/erp/dashboard?page=admin-settings&gdrive_success=true&email=${encodeURIComponent(
          result.email || '',
        )}`,
      );
    } catch (err: any) {
      return res.redirect(
        `${frontendBase}/erp/dashboard?page=admin-settings&gdrive_error=${encodeURIComponent(
          err.message || 'Authorization failed',
        )}`,
      );
    }
  }

  /**
   * 3. Connection status (safe for frontend, never exposes tokens)
   */
  @Get('status')
  @Permissions(Permission.SETTINGS_READ)
  getStatus() {
    return this.googleDriveService.getStatus();
  }

  /**
   * 4. Disconnect Google Drive
   */
  @Delete('disconnect')
  @Permissions(Permission.SETTINGS_UPDATE)
  disconnect() {
    return this.googleDriveService.disconnect();
  }

  /**
   * 5. Manual trigger to sync all pending/failed employee documents
   */
  @Post('sync-all')
  @Permissions(Permission.SETTINGS_UPDATE)
  syncAll() {
    return this.googleDriveService.syncAllPendingDocuments();
  }
}
