import { File } from "../entities/File";
import MinioService from "./MinioService";
import { initORM } from "../db";

export interface CreateFileDto {
  name: string;
  objectKey: string;
  path: string;
  size: number;
  mimeType?: string;
  userId: number;
}

export interface UpdateFileDto {
  name?: string;
  path?: string;
}

export interface ListFilesQuery {
  path?: string;
  userId: number;
  page?: number;
  limit?: number;
}

export interface FileListResponse {
  files: File[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class FileService {
  private minioService: MinioService | null = null;
  private bucketName: string;

  constructor() {
    this.bucketName = 'ghost-drive'; // Default bucket name
  }

  private getMinioService(): MinioService {
    if (!this.minioService) {
      this.minioService = new MinioService();
    }
    return this.minioService;
  }

  /**
   * Get presigned URL for file upload
   */
  async getUploadPresignedUrl(objectKey: string): Promise<string> {
    return await this.getMinioService().getUploadPresignedUrl(this.bucketName, objectKey);
  }

  /**
   * Get presigned URL for file download
   */
  async getDownloadPresignedUrl(objectKey: string): Promise<string> {
    return await this.getMinioService().getDownloadPresignedUrl(this.bucketName, objectKey);
  }

  /**
   * Create a new file record
   */
  async createFile(fileData: CreateFileDto): Promise<File> {
    const { services } = await this.getServices();
    
    // Validate path format
    this.validatePath(fileData.path);
    
    const file = new File();
    Object.assign(file, fileData);
    
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
  async updateFile(fileId: number, userId: number, updateData: UpdateFileDto): Promise<File | null> {
    const { services } = await this.getServices();
    
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      return null;
    }

    if (updateData.name !== undefined) {
      file.name = updateData.name;
    }

    if (updateData.path !== undefined) {
      this.validatePath(updateData.path);
      file.path = updateData.path;
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
      // Delete from S3
      await this.getMinioService().deleteFile(this.bucketName, file.objectKey);
      
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
  async listFiles(query: ListFilesQuery): Promise<FileListResponse> {
    const { services } = await this.getServices();
    
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = { userId: query.userId };
    if (query.path) {
      whereClause.path = query.path;
    }

    const [files, total] = await services.file.findAndCount(whereClause, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    return {
      files,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all files in a directory tree (recursive)
   */
  async getDirectoryTree(userId: number, path: string = '/'): Promise<File[]> {
    const { services } = await this.getServices();
    
    // Get all files that start with the given path
    const files = await services.file.find({
      userId,
      path: { $like: `${path}%` }
    }, {
      orderBy: { path: 'ASC', name: 'ASC' }
    });

    return files;
  }

  /**
   * Create a directory (virtual - just a file with no size)
   */
  async createDirectory(name: string, path: string, userId: number): Promise<File> {
    const { services } = await this.getServices();
    
    this.validatePath(path);
    
    // Ensure path ends with /
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    
    const directory = new File();
    directory.name = name;
    directory.objectKey = `directory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    directory.path = normalizedPath;
    directory.size = 0;
    directory.mimeType = 'application/x-directory';
    directory.userId = userId;
    
    await services.em.persistAndFlush(directory);
    return directory;
  }

  /**
   * Move file to different directory
   */
  async moveFile(fileId: number, userId: number, newPath: string): Promise<File | null> {
    const { services } = await this.getServices();
    
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      return null;
    }

    this.validatePath(newPath);
    
    // Ensure new path ends with / for directories
    if (file.mimeType === 'application/x-directory') {
      file.path = newPath.endsWith('/') ? newPath : `${newPath}/`;
    } else {
      file.path = newPath;
    }

    await services.em.flush();
    return file;
  }

  /**
   * Search files by name or path
   */
  async searchFiles(userId: number, query: string, page: number = 1, limit: number = 20): Promise<FileListResponse> {
    const { services } = await this.getServices();
    
    const offset = (page - 1) * limit;
    
    // Search by name or path containing the query
    const [files, total] = await services.file.findAndCount({
      userId,
      $or: [
        { name: { $ilike: `%${query}%` } },
        { path: { $ilike: `%${query}%` } }
      ]
    }, {
      orderBy: { updatedAt: 'DESC' },
      limit,
      offset,
    });
    
    return {
      files,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
