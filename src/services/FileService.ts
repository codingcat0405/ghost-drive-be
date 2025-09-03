import { File } from "../entities/File";
import { User } from "../entities/User";
import MinioService from "./MinioService";
import { initORM } from "../db";
import { Page, toPageDTO } from "../utils/pagination";

class FileService {
  private minioService: MinioService | null = null;
  private defaultBucketName: string;

  constructor() {
    this.defaultBucketName = 'ghost-drive'; // Default bucket for common uploads (avatars, etc.)
  }

  private getMinioService(): MinioService {
    if (!this.minioService) {
      this.minioService = new MinioService();
    }
    return this.minioService;
  }

  /**
   * Get user's bucket name from database
   */
  private async getUserBucketName(userId: number): Promise<string> {
    const { services } = await this.getServices();
    const user = await services.user.findOne({ id: userId });
    if (!user || !user.bucketName) {
      throw new Error('User not found or bucket name not set');
    }
    return user.bucketName;
  }

  /**
   * Get presigned URL for file upload (uses user's bucket)
   */
  async getUploadPresignedUrl(objectKey: string, userId: number): Promise<string> {
    const bucketName = await this.getUserBucketName(userId);
    return await this.getMinioService().getUploadPresignedUrl(bucketName, objectKey);
  }

  /**
   * Get presigned URL for file download (uses user's bucket)
   */
  async getDownloadPresignedUrl(objectKey: string, userId: number): Promise<string> {
    const bucketName = await this.getUserBucketName(userId);
    return await this.getMinioService().getDownloadPresignedUrl(bucketName, objectKey);
  }

  /**
   * Get presigned URL for common uploads (uses default bucket)
   */
  async getCommonUploadPresignedUrl(objectKey: string): Promise<string> {
    return await this.getMinioService().getUploadPresignedUrl(this.defaultBucketName, objectKey);
  }

  /**
   * Get presigned URL for common downloads (uses default bucket)
   */
  async getCommonDownloadPresignedUrl(objectKey: string): Promise<string> {
    return await this.getMinioService().getDownloadPresignedUrl(this.defaultBucketName, objectKey);
  }

  /**
   * Create a new file record
   */
  async createFile(
    name: string,
    objectKey: string,
    path: string,
    size: number,
    userId: number,
    mimeType?: string
  ): Promise<File> {
    const { services } = await this.getServices();
    
    // Validate path format
    this.validatePath(path);
    
    const file = new File();
    file.name = name;
    file.objectKey = objectKey;
    file.path = path;
    file.size = size;
    file.userId = userId;
    if (mimeType) {
      file.mimeType = mimeType;
    }
    
    await services.em.persistAndFlush(file);
    return file;
  }

  /**
   * Get file by ID and user ID
   */
  async getFileById(fileId: number, userId: number): Promise<File | null> {
    const { services } = await this.getServices();
    
    return await services.file.findOne({ id: fileId, userId });
  }

  /**
   * Update file (name and path only - virtual changes)
   */
  async updateFile(
    fileId: number, 
    userId: number, 
    name?: string, 
    path?: string
  ): Promise<File | null> {
    const { services } = await this.getServices();
    
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      return null;
    }

    if (name !== undefined) {
      file.name = name;
    }

    if (path !== undefined) {
      this.validatePath(path);
      // Ensure new path ends with / for directories
      if (file.mimeType === 'application/x-directory') {
        file.path = path.endsWith('/') ? path : `${path}/`;
      } else {
        file.path = path;
      }
    }

    await services.em.flush();
    return file;
  }

  /**
   * Delete file (removes from S3 and database)
   */
  async deleteFile(fileId: number, userId: number): Promise<boolean> {
    const { services } = await this.getServices();
    
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      return false;
    }

    try {
      // Get user's bucket name
      const bucketName = await this.getUserBucketName(userId);
      
      // Delete from S3
      await this.getMinioService().deleteFile(bucketName, file.objectKey);
      
      // Delete from database
      await services.em.removeAndFlush(file);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * List files by directory with pagination
   */
  async listFiles(
    userId: number,
    path?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Page<File>> {
    const { services } = await this.getServices();
    
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = { userId };
    if (path) {
      whereClause.path = path;
    }

    const findAndCount = await services.file.findAndCount(whereClause, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    return toPageDTO(findAndCount, page, limit);
  }

  /**
   * Get files and folders in a specific directory (non-recursive)
   */
  async getDirectoryTree(userId: number, path: string = '/'): Promise<File[]> {
    const { services } = await this.getServices();
    
    // Normalize path - ensure it ends with / for proper matching
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    
    // Get only direct children of the specified path
    // This means files where the path exactly matches the given path
    const files = await services.file.find({
      userId,
      path: normalizedPath
    }, {
      orderBy: { 
        // Directories first (by mimeType), then by name
        mimeType: 'ASC', // 'application/x-directory' comes before other types
        name: 'ASC' 
      }
    });

    return files;
  }

  /**
   * Search files by name or path
   */
  async searchFiles(
    userId: number, 
    query: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<Page<File>> {
    const { services } = await this.getServices();
    
    const offset = (page - 1) * limit;
    
    // Search by name containing the query
    const findAndCount = await services.file.findAndCount({
      userId,
      name: { $ilike: `%${query}%` }
    }, {
      orderBy: { updatedAt: 'DESC' },
      limit,
      offset,
    });
    
    return toPageDTO(findAndCount, page, limit);
  }

  /**
   * Validate path format
   */
  private validatePath(path: string): void {
    if (!path.startsWith('/')) {
      throw new Error('Path must start with /');
    }
    
    // Check for invalid characters
    if (path.includes('..') || path.includes('//')) {
      throw new Error('Invalid path format');
    }
  }

  /**
   * Get database services
   */
  private async getServices() {
    const db = await initORM();
    return { services: db };
  }
}

export default FileService;
