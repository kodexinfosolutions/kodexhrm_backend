import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

const GOOGLE_DRIVE_SETTING_KEY = 'INTEGRATION_GOOGLE_DRIVE';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface GoogleDriveStatus {
  connected: boolean;
  email?: string;
  rootFolderId?: string;
  rootFolderName?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getOAuthClient(): OAuth2Client {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_DRIVE_CALLBACK_URL ||
      'http://localhost:3005/erp/api/integrations/google-drive/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google Drive OAuth credentials are not properly configured in environment variables (GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET).',
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * 1. Generate Google OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    const oauth2Client = this.getOAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // ensures refresh_token is returned
      prompt: 'consent', // ensures consent screen to obtain fresh refresh_token
      scope: [
        DRIVE_SCOPE,
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  /**
   * 2. Handle OAuth callback code exchange & store tokens securely in AppSetting
   */
  async handleOAuthCallback(code: string): Promise<{ success: boolean; email?: string }> {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    const oauth2Client = this.getOAuthClient();
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Fetch user email for display
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email || 'connected-account';

      // Read existing setting if any to preserve rootFolderId
      const existing = await this.prisma.appSetting.findUnique({
        where: { key: GOOGLE_DRIVE_SETTING_KEY },
      });
      const existingData = (existing?.value as any) || {};

      // If refresh_token is not returned on re-consent, fallback to previously stored refresh token
      const refreshToken = tokens.refresh_token || existingData.tokens?.refresh_token;

      const updatedTokens = {
        ...tokens,
        refresh_token: refreshToken,
      };

      // Set credentials to locate or create root folder "Kodex HRM"
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const rootFolderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'Kodex HRM';
      const rootFolderId = await this.getOrCreateFolder(drive, rootFolderName, null);

      const storagePayload = {
        connected: true,
        email,
        rootFolderId,
        rootFolderName,
        tokens: updatedTokens,
        connectedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
      };

      await this.prisma.appSetting.upsert({
        where: { key: GOOGLE_DRIVE_SETTING_KEY },
        update: { value: storagePayload },
        create: {
          key: GOOGLE_DRIVE_SETTING_KEY,
          value: storagePayload,
        },
      });

      this.logger.log(`Google Drive integration connected for account: ${email}`);
      return { success: true, email };
    } catch (err: any) {
      this.logger.error('Failed to exchange Google OAuth code', err.stack);
      throw new InternalServerErrorException(
        err.response?.data?.error_description || err.message || 'Failed to complete Google Drive authorization',
      );
    }
  }

  /**
   * 3. Get connection status without exposing sensitive tokens
   */
  async getStatus(): Promise<GoogleDriveStatus> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: GOOGLE_DRIVE_SETTING_KEY },
    });

    if (!setting || !setting.value) {
      return { connected: false };
    }

    const val = setting.value as any;
    if (!val.connected || !val.tokens?.refresh_token) {
      return { connected: false };
    }

    return {
      connected: true,
      email: val.email,
      rootFolderId: val.rootFolderId,
      rootFolderName: val.rootFolderName || 'Kodex HRM',
      connectedAt: val.connectedAt,
      lastSyncAt: val.lastSyncAt,
    };
  }

  /**
   * 4. Disconnect Google Drive
   */
  async disconnect(): Promise<{ success: boolean; message: string }> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: GOOGLE_DRIVE_SETTING_KEY },
    });

    if (setting && setting.value) {
      const val = setting.value as any;
      if (val.tokens?.access_token) {
        try {
          const oauth2Client = this.getOAuthClient();
          await oauth2Client.revokeToken(val.tokens.access_token);
        } catch (revokeErr) {
          this.logger.warn('Failed to revoke Google token on disconnect (may already be expired):', revokeErr);
        }
      }
    }

    await this.prisma.appSetting.deleteMany({
      where: { key: GOOGLE_DRIVE_SETTING_KEY },
    });

    this.logger.log('Google Drive disconnected.');
    return { success: true, message: 'Google Drive integration disconnected successfully' };
  }

  /**
   * 5. Get authenticated Google Drive client with auto token refresh
   */
  private async getAuthenticatedDriveClient() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: GOOGLE_DRIVE_SETTING_KEY },
    });

    if (!setting || !setting.value) {
      return null;
    }

    const val = setting.value as any;
    if (!val.connected || !val.tokens) {
      return null;
    }

    const oauth2Client = this.getOAuthClient();
    oauth2Client.setCredentials(val.tokens);

    // Listen for refreshed tokens and save them back to database
    oauth2Client.on('tokens', async (newTokens) => {
      this.logger.log('Google OAuth tokens refreshed automatically.');
      const currentSetting = await this.prisma.appSetting.findUnique({
        where: { key: GOOGLE_DRIVE_SETTING_KEY },
      });
      if (currentSetting?.value) {
        const currentVal = currentSetting.value as any;
        const mergedTokens = {
          ...currentVal.tokens,
          ...newTokens,
          refresh_token: newTokens.refresh_token || currentVal.tokens?.refresh_token,
        };
        await this.prisma.appSetting.update({
          where: { key: GOOGLE_DRIVE_SETTING_KEY },
          data: {
            value: {
              ...currentVal,
              tokens: mergedTokens,
              lastSyncAt: new Date().toISOString(),
            },
          },
        });
      }
    });

    return {
      drive: google.drive({ version: 'v3', auth: oauth2Client }),
      rootFolderId: val.rootFolderId,
    };
  }

  /**
   * Helper: Get or create folder under a parent
   */
  private async getOrCreateFolder(
    drive: any,
    folderName: string,
    parentId: string | null,
  ): Promise<string> {
    const parentQuery = parentId
      ? `'${parentId}' in parents`
      : `'root' in parents`;
    const escapedName = folderName.replace(/'/g, "\\'");
    const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and ${parentQuery} and trashed = false`;

    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      return searchRes.data.files[0].id;
    }

    // Create folder
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const createRes = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return createRes.data.id;
  }

  /**
   * 6. Upload staff document into Google Drive:
   * Root: "Kodex HRM" -> Employee folder: "[EmployeeId] - [Name]" -> Document file
   */
  async uploadStaffDocument(staffDocumentId: string): Promise<void> {
    try {
      const authData = await this.getAuthenticatedDriveClient();
      if (!authData) {
        this.logger.debug('Google Drive integration is not connected. Skipping Drive sync.');
        return;
      }

      const { drive, rootFolderId } = authData;

      const doc = await this.prisma.staffDocument.findUnique({
        where: { id: staffDocumentId },
        include: { staff: true },
      });

      if (!doc || !doc.staff) {
        this.logger.warn(`StaffDocument ${staffDocumentId} not found.`);
        return;
      }

      // Check if file exists locally
      const localFilePath = path.resolve(doc.url);
      if (!fs.existsSync(localFilePath)) {
        this.logger.error(`File path not found on disk: ${localFilePath}`);
        await this.prisma.staffDocument.update({
          where: { id: doc.id },
          data: {
            googleDriveSyncStatus: 'FAILED',
            googleDriveError: 'File not found on local disk',
          },
        });
        return;
      }

      // Ensure root folder exists
      const effectiveRootId =
        rootFolderId ||
        (await this.getOrCreateFolder(
          drive,
          process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'Kodex HRM',
          null,
        ));

      // Employee folder name: e.g. "EMP-001 - John Doe"
      const empFolderTitle = `${doc.staff.employeeId || 'STAFF'} - ${doc.staff.name.replace(/[/\\?%*:|"<>]/g, '_')}`;
      const employeeFolderId = await this.getOrCreateFolder(
        drive,
        empFolderTitle,
        effectiveRootId,
      );

      // Check duplicate in the employee folder
      const docName = doc.fileName || doc.title || path.basename(localFilePath);
      const escapedDocName = docName.replace(/'/g, "\\'");
      const existingCheck = await drive.files.list({
        q: `'${employeeFolderId}' in parents and name = '${escapedDocName}' and trashed = false`,
        fields: 'files(id, name)',
      });

      let driveFileId: string | null = null;

      if (existingCheck.data.files && existingCheck.data.files.length > 0) {
        // Update existing file
        driveFileId = existingCheck.data.files[0].id || null;
        if (driveFileId) {
          await drive.files.update({
            fileId: driveFileId,
            media: {
              body: fs.createReadStream(localFilePath),
            },
          });
          this.logger.log(`Updated existing Google Drive file: ${docName} (${driveFileId})`);
        }
      } else {
        // Create new file
        const fileMetadata = {
          name: docName,
          parents: [employeeFolderId],
        };
        const createRes = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            body: fs.createReadStream(localFilePath),
          },
          fields: 'id',
        });
        driveFileId = createRes.data.id || null;
        this.logger.log(`Uploaded new Google Drive file: ${docName} (${driveFileId})`);
      }

      if (!driveFileId) {
        throw new Error('Failed to obtain Google Drive file ID after upload');
      }

      // Update database status
      await this.prisma.staffDocument.update({
        where: { id: doc.id },
        data: {
          googleDriveFileId: driveFileId,
          googleDriveFolderId: employeeFolderId,
          googleDriveSyncStatus: 'SYNCED',
          googleDriveSyncedAt: new Date(),
          googleDriveError: null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to sync document ${staffDocumentId} to Google Drive:`, err.stack);
      try {
        await this.prisma.staffDocument.update({
          where: { id: staffDocumentId },
          data: {
            googleDriveSyncStatus: 'FAILED',
            googleDriveError: err.message || 'Unknown upload failure',
          },
        });
      } catch (dbErr) {
        this.logger.error('Failed to update sync failure status in DB', dbErr);
      }
    }
  }

  /**
   * 7. Sync all pending/failed documents to Google Drive
   */
  async syncAllPendingDocuments(): Promise<{ total: number; synced: number; failed: number }> {
    const authData = await this.getAuthenticatedDriveClient();
    if (!authData) {
      throw new BadRequestException('Google Drive is not connected');
    }

    const pendingDocs = await this.prisma.staffDocument.findMany({
      where: {
        OR: [
          { googleDriveSyncStatus: null },
          { googleDriveSyncStatus: 'LOCAL' },
          { googleDriveSyncStatus: 'FAILED' },
        ],
      },
      select: { id: true },
    });

    let synced = 0;
    let failed = 0;

    for (const d of pendingDocs) {
      await this.uploadStaffDocument(d.id);
      const rechecked = await this.prisma.staffDocument.findUnique({
        where: { id: d.id },
        select: { googleDriveSyncStatus: true },
      });
      if (rechecked?.googleDriveSyncStatus === 'SYNCED') {
        synced++;
      } else {
        failed++;
      }
    }

    return { total: pendingDocs.length, synced, failed };
  }

  /**
   * 8. Trash file in Google Drive on document deletion
   * Moves file to Trash (`trashed: true`) rather than permanently deleting.
   * Handles non-connected Drive, missing Drive file ID, already-deleted/404 files, and network errors.
   */
  async trashDriveFile(
    googleDriveFileId: string | null | undefined,
  ): Promise<{ success: boolean; error?: string; trashed: boolean }> {
    if (!googleDriveFileId) {
      return { success: true, trashed: false };
    }

    const authData = await this.getAuthenticatedDriveClient();
    if (!authData) {
      this.logger.warn(
        `Google Drive is not connected. Cannot trash Drive file ${googleDriveFileId}.`,
      );
      return {
        success: false,
        trashed: false,
        error: 'Google Drive is not currently connected to process deletion sync.',
      };
    }

    const { drive } = authData;

    try {
      await drive.files.update({
        fileId: googleDriveFileId,
        requestBody: {
          trashed: true,
        },
      });

      this.logger.log(`Successfully moved Google Drive file to Trash: ${googleDriveFileId}`);
      return { success: true, trashed: true };
    } catch (err: any) {
      const status = err.response?.status || err.code;
      // If 404 (file not found or already deleted in Drive), treat as successfully removed from Drive
      if (status === 404 || err.message?.includes('File not found')) {
        this.logger.warn(`Google Drive file ${googleDriveFileId} was already deleted or not found (404).`);
        return { success: true, trashed: false };
      }

      const errMsg = err.response?.data?.error?.message || err.message || 'Unknown Google Drive API error';
      this.logger.error(`Failed to trash Google Drive file ${googleDriveFileId}: ${errMsg}`, err.stack);
      return {
        success: false,
        trashed: false,
        error: errMsg,
      };
    }
  }
}
