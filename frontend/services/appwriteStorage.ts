/**
 * Appwrite Storage Service
 * Handles file upload, download, and management operations
 */

import { storage, STORAGE_BUCKETS, logAppwriteError, withRetry } from './appwrite';
import { ID, ImageGravity, ImageFormat } from 'react-native-appwrite';
import type { UploadProgress as AppwriteUploadProgress } from 'react-native-appwrite';
import type { UploadProgress, UploadResult } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface FileUploadOptions {
  bucketId: string;
  fileId?: string;
  file: {
    name: string;
    type: string;
    size: number;
    uri: string;
  };
  permissions?: string[];
  onProgress?: (progress: UploadProgress) => void;
}

export interface FileInfo {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  name: string;
  signature: string;
  mimeType: string;
  sizeOriginal: number;
  chunksTotal: number;
  chunksUploaded: number;
}

export interface FilePreview {
  width?: number;
  height?: number;
  gravity?: ImageGravity;
  quality?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  opacity?: number;
  rotation?: number;
  background?: string;
  output?: ImageFormat;
}

// =============================================================================
// STORAGE SERVICE CLASS
// =============================================================================

export class StorageService {
  /**
   * Upload a file to storage
   */
  async uploadFile(options: FileUploadOptions): Promise<UploadResult> {
    try {
      const fileId = options.fileId || ID.unique();
      
      // Create upload progress tracker
      let uploadProgress: UploadProgress = {
        loaded: 0,
        total: 0,
        percentage: 0,
      };

      const startTime = Date.now();

      const file = await withRetry(() =>
        storage.createFile(
          options.bucketId,
          fileId,
          options.file,
          options.permissions,
          (progress: AppwriteUploadProgress) => {
            const currentTime = Date.now();
            const elapsedTime = (currentTime - startTime) / 1000; // seconds
            const totalSize = options.file.size;
            
            uploadProgress = {
              loaded: progress.sizeUploaded || 0,
              total: totalSize,
              percentage: progress.progress || 0,
              speed: elapsedTime > 0 ? (progress.sizeUploaded || 0) / elapsedTime : 0,
            };

            if (uploadProgress.speed && uploadProgress.speed > 0) {
              uploadProgress.timeRemaining = (totalSize - uploadProgress.loaded) / uploadProgress.speed;
            }

            options.onProgress?.(uploadProgress);
          }
        )
      );

      const fileInfo = file as unknown as FileInfo;

      return {
        success: true,
        fileId: fileInfo.$id,
        url: this.getFileView(options.bucketId, fileInfo.$id),
        metadata: {
          filename: fileInfo.name,
          size: fileInfo.sizeOriginal,
          mimeType: fileInfo.mimeType,
          uploadedAt: fileInfo.$createdAt,
        },
      };
    } catch (error) {
      logAppwriteError(error, `StorageService.uploadFile - Bucket: ${options.bucketId}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get file information
   */
  async getFile(bucketId: string, fileId: string): Promise<FileInfo> {
    try {
      const file = await withRetry(() => storage.getFile(bucketId, fileId));
      return file as unknown as FileInfo;
    } catch (error) {
      logAppwriteError(error, `StorageService.getFile - Bucket: ${bucketId}, File: ${fileId}`);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(bucketId: string, fileId: string): Promise<void> {
    try {
      await withRetry(() => storage.deleteFile(bucketId, fileId));
    } catch (error) {
      logAppwriteError(error, `StorageService.deleteFile - Bucket: ${bucketId}, File: ${fileId}`);
      throw error;
    }
  }

  /**
   * List files in a bucket
   */
  async listFiles(bucketId: string, queries?: string[]): Promise<FileInfo[]> {
    try {
      const files = await withRetry(() => storage.listFiles(bucketId, queries));
      return files.files as unknown as FileInfo[];
    } catch (error) {
      logAppwriteError(error, `StorageService.listFiles - Bucket: ${bucketId}`);
      throw error;
    }
  }

  /**
   * Get file view URL
   */
  getFileView(bucketId: string, fileId: string): string {
    return storage.getFileView(bucketId, fileId).toString();
  }

  /**
   * Get file download URL
   */
  getFileDownload(bucketId: string, fileId: string): string {
    return storage.getFileDownload(bucketId, fileId).toString();
  }

  /**
   * Get file preview URL
   */
  getFilePreview(
    bucketId: string,
    fileId: string,
    options?: FilePreview
  ): string {
    return storage.getFilePreview(
      bucketId,
      fileId,
      options?.width,
      options?.height,
      options?.gravity || ImageGravity.Center,
      options?.quality,
      options?.borderWidth,
      options?.borderColor,
      options?.borderRadius,
      options?.opacity,
      options?.rotation,
      options?.background,
      options?.output
    ).toString();
  }

  /**
   * Update file permissions
   */
  async updateFilePermissions(
    bucketId: string,
    fileId: string,
    permissions: string[]
  ): Promise<FileInfo> {
    try {
      const file = await withRetry(() =>
        storage.updateFile(bucketId, fileId, undefined, permissions)
      );
      return file as unknown as FileInfo;
    } catch (error) {
      logAppwriteError(error, `StorageService.updateFilePermissions - Bucket: ${bucketId}, File: ${fileId}`);
      throw error;
    }
  }
}

// =============================================================================
// SPECIALIZED STORAGE SERVICES
// =============================================================================

/**
 * Patient Documents Storage Service
 */
export class PatientDocumentsService extends StorageService {
  private bucketId = STORAGE_BUCKETS.PATIENT_DOCUMENTS;

  async uploadPatientDocument(
    patientId: string,
    file: { name: string; type: string; size: number; uri: string },
    documentType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const fileId = `${patientId}_${documentType}_${Date.now()}`;
    
    return this.uploadFile({
      bucketId: this.bucketId,
      fileId,
      file,
      permissions: [`read("user:${patientId}")`], // Only patient can read their documents
      onProgress,
    });
  }

  async getPatientDocuments(patientId: string): Promise<FileInfo[]> {
    return this.listFiles(this.bucketId, [`equal("name", "${patientId}")`]);
  }

  async deletePatientDocument(fileId: string): Promise<void> {
    return this.deleteFile(this.bucketId, fileId);
  }
}

/**
 * Vaccine Images Storage Service
 */
export class VaccineImagesService extends StorageService {
  private bucketId = STORAGE_BUCKETS.VACCINE_IMAGES;

  async uploadVaccineImage(
    vaccineId: string,
    file: { name: string; type: string; size: number; uri: string },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const fileId = `vaccine_${vaccineId}_${Date.now()}`;
    
    return this.uploadFile({
      bucketId: this.bucketId,
      fileId,
      file,
      permissions: ['read("any")'], // Public read access for vaccine images
      onProgress,
    });
  }

  async getVaccineImage(vaccineId: string): Promise<FileInfo | null> {
    try {
      const files = await this.listFiles(this.bucketId, [`search("name", "vaccine_${vaccineId}")`]);
      return files[0] || null;
    } catch (error) {
      return null;
    }
  }

  getVaccineImagePreview(
    vaccineId: string,
    fileId: string,
    width: number = 300,
    height: number = 200
  ): string {
    return this.getFilePreview(this.bucketId, fileId, {
      width,
      height,
      gravity: ImageGravity.Center,
      quality: 80,
      output: ImageFormat.Webp,
    });
  }
}

/**
 * Reports Storage Service
 */
export class ReportsService extends StorageService {
  private bucketId = STORAGE_BUCKETS.REPORTS;

  async uploadReport(
    reportType: string,
    facilityId: string,
    file: { name: string; type: string; size: number; uri: string },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileId = `${reportType}_${facilityId}_${timestamp}_${Date.now()}`;
    
    return this.uploadFile({
      bucketId: this.bucketId,
      fileId,
      file,
      permissions: [`read("facility:${facilityId}")`], // Facility-specific access
      onProgress,
    });
  }

  async getFacilityReports(facilityId: string): Promise<FileInfo[]> {
    return this.listFiles(this.bucketId, [`search("name", "${facilityId}")`]);
  }

  async getReportsByType(reportType: string): Promise<FileInfo[]> {
    return this.listFiles(this.bucketId, [`search("name", "${reportType}")`]);
  }
}

/**
 * Profile Images Storage Service
 */
export class ProfileImagesService extends StorageService {
  private bucketId = STORAGE_BUCKETS.PROFILE_IMAGES;

  async uploadProfileImage(
    userId: string,
    file: { name: string; type: string; size: number; uri: string },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const fileId = `profile_${userId}`;
    
    // Delete existing profile image first
    try {
      await this.deleteFile(this.bucketId, fileId);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    return this.uploadFile({
      bucketId: this.bucketId,
      fileId,
      file,
      permissions: [`read("user:${userId}")`], // Only user can read their profile image
      onProgress,
    });
  }

  async getProfileImage(userId: string): Promise<FileInfo | null> {
    try {
      return await this.getFile(this.bucketId, `profile_${userId}`);
    } catch (error) {
      return null;
    }
  }

  getProfileImagePreview(
    userId: string,
    size: number = 150
  ): string {
    return this.getFilePreview(this.bucketId, `profile_${userId}`, {
      width: size,
      height: size,
      gravity: ImageGravity.Center,
      quality: 90,
      borderRadius: size / 2, // Make it circular
      output: ImageFormat.Webp,
    });
  }

  async deleteProfileImage(userId: string): Promise<void> {
    return this.deleteFile(this.bucketId, `profile_${userId}`);
  }
}

// =============================================================================
// SERVICE INSTANCES
// =============================================================================

export const storageService = new StorageService();
export const patientDocumentsService = new PatientDocumentsService();
export const vaccineImagesService = new VaccineImagesService();
export const reportsService = new ReportsService();
export const profileImagesService = new ProfileImagesService();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
  
  return prefix 
    ? `${prefix}_${baseName}_${timestamp}_${random}.${extension}`
    : `${baseName}_${timestamp}_${random}.${extension}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a document
 */
export function isDocumentFile(file: File): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  return documentTypes.includes(file.type);
}

/**
 * Batch file upload with progress tracking
 */
export async function batchUpload(
  files: Array<{
    file: { name: string; type: string; size: number; uri: string };
    bucketId: string;
    fileId?: string;
    permissions?: string[];
  }>,
  onProgress?: (overall: UploadProgress, fileIndex: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  let totalSize = 0;
  let uploadedSize = 0;

  // Calculate total size
  files.forEach(({ file }) => {
    totalSize += file.size;
  });

  for (let i = 0; i < files.length; i++) {
    const fileConfig = files[i];
    
    const result = await storageService.uploadFile({
      ...fileConfig,
      onProgress: (progress) => {
        const currentFileUploaded = progress.loaded;
        const overallProgress: UploadProgress = {
          loaded: uploadedSize + currentFileUploaded,
          total: totalSize,
          percentage: totalSize > 0 ? Math.round(((uploadedSize + currentFileUploaded) / totalSize) * 100) : 0,
          speed: progress.speed,
          timeRemaining: progress.timeRemaining,
        };
        
        onProgress?.(overallProgress, i);
      },
    });

    results.push(result);
    
    if (result.success) {
      uploadedSize += fileConfig.file.size;
    }
  }

  return results;
}

export default {
  StorageService,
  storageService,
  patientDocumentsService,
  vaccineImagesService,
  reportsService,
  profileImagesService,
  validateFileType,
  validateFileSize,
  getFileExtension,
  generateUniqueFilename,
  formatFileSize,
  isImageFile,
  isDocumentFile,
  batchUpload,
};