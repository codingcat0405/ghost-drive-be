import { File } from "../entities/File";
import MinioService from "./MinioService";
import { initORM } from "../db";
import { Page, toPageDTO } from "../utils/pagination";
import { Folder } from "../entities/Folder";

class FileService {
  private minioService: MinioService;

  constructor() {
    this.minioService = new MinioService();
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
    return await this.minioService.getUploadPresignedUrl(bucketName, objectKey);
  }

  /**
   * Get presigned URL for file download (uses user's bucket)
   */
  async getDownloadPresignedUrl(objectKey: string, userId: number): Promise<string> {
    const bucketName = await this.getUserBucketName(userId);
    return await this.minioService.getDownloadPresignedUrl(bucketName, objectKey);
  }

  /**
   * Get presigned URL for common uploads (uses default bucket)
   */
  async getCommonUploadPresignedUrl(objectKey: string) {
    const presignedUrl = await this.minioService.getUploadPresignedUrl(process.env.MINIO_COMMON_BUCKET!, objectKey);
    //download url is the presigned url without the query params
    const downloadUrl = new URL(presignedUrl);
    downloadUrl.search = '';
    console.log(presignedUrl);
    return {
      presignedUrl: presignedUrl,
      downloadUrl: downloadUrl
    }
  }


  /**
   * Create a new file record
   */
  async createFile(body: {
    name: string,
    objectKey: string,
    folderId?: number,
    size: number,
    userId: number,
    mimeType?: string
  }): Promise<File> {
    const { name, objectKey, folderId, size, userId, mimeType } = body;
    const { services } = await this.getServices();
    const userRootFolder = await services.folder.findOne({ userId, name: '/' });
    if (!userRootFolder) {
      throw new Error('User root folder not found');
    }
    const file = services.file.create({
      name,
      objectKey,
      folderId: folderId ?? userRootFolder.id, // if folderId is not provided, use user root folder
      size,
      userId,
      mimeType: mimeType ?? 'application/octet-stream'
    })

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
   * Update file (name and folderId only - virtual changes)
   */
  async updateFile(
    fileId: number,
    userId: number,
    name?: string,
    folderId?: number
  ): Promise<File | null> {
    const { services } = await this.getServices();

    const file = await this.getFileById(fileId, userId);
    if (!file) {
      return null;
    }

    if (name) {
      file.name = name;
    }

    if (folderId) {
      const folder = await services.folder.findOne({ id: folderId, userId });
      if (!folder) {
        throw new Error('Folder not found or not belongs to this user');
      }
      file.folderId = folder.id;
    }

    await services.em.flush();
    return file;
  }

  async createFolder(name: string, userId: number, parentId?: number): Promise<Folder> {
    const { services } = await this.getServices();
    if (name === '/') {
      throw new Error('Cannot create root folder');
    }
    const userRootFolder = await services.folder.findOne({ userId, parentId: null });
    if (!userRootFolder) {
      throw new Error('User root folder not found');
    }
    const folder = services.folder.create({ name, userId, parentId: parentId ?? userRootFolder.id }); // if parentId is not provided, use user root folder
    await services.em.persistAndFlush(folder);
    return folder;
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
      await this.minioService.deleteFile(bucketName, file.objectKey);

      // Delete from database
      await services.em.removeAndFlush(file);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async updateFolder(folderId: number, userId: number, name: string, parentId?: number): Promise<Folder> {
    const { services } = await this.getServices();
    const folder = await services.folder.findOne({ id: folderId, userId });
    if (!folder) {
      throw new Error('Folder not found or not belongs to this user');
    }
    if (parentId) {
      const parentFolder = await services.folder.findOne({ id: parentId, userId });
      if (!parentFolder) {
        throw new Error('Parent folder not found or not belongs to this user');
      }
      if (parentFolder.id === folder.id) {
        throw new Error('Parent folder cannot be the same as the folder itself');
      }
      if (parentFolder.parentId === folder.id) {
        throw new Error('Parent folder cannot be the child of the folder itself');
      }
      folder.parentId = parentId;
    }
    folder.name = name;
    await services.em.flush();
    return folder;
  }
  /**
   * Delete folder (removes from database)
   * Delete all files in the folder form both database and s3
   */
  async deleteFolder(folderId: number, userId: number): Promise<boolean> {
    const { services } = await this.getServices();
    const folder = await services.folder.findOne({ id: folderId, userId });
    if (!folder) {
      throw new Error('Folder not found or not belongs to this user');
    }
    if (folder.parentId === null) {
      throw new Error('Cannot delete root folder');
    }
    const files = await services.file.find({ folderId });
    for (const file of files) {
      await this.deleteFile(file.id, userId);
    }
    await services.em.removeAndFlush(folder);
    return true;
  }

  /**
   * List files by directory with pagination
   */
  async listFiles(
    userId: number,
    folderId?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<Page<File>> {
    const { services } = await this.getServices();

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = { userId };
    if (folderId) {
      whereClause.folderId = folderId;
    }

    const findAndCount = await services.file.findAndCount(whereClause, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    return toPageDTO(findAndCount, page, limit);
  }

  async listFolders(
    userId: number,
    parentId?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<Page<Folder>> {
    const { services } = await this.getServices();
    const offset = (page - 1) * limit;
    const whereClause: any = { userId };
    if (parentId) {
      whereClause.parentId = parentId;
    }
    const findAndCount = await services.folder.findAndCount(whereClause, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });
    return toPageDTO(findAndCount, page, limit);
  }

  /**
   * Search files by name
   */
  async searchFiles(
    userId: number,
    name: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Page<File>> {
    const { services } = await this.getServices();

    const offset = (page - 1) * limit;

    // Search by name containing the query
    const findAndCount = await services.file.findAndCount({
      userId,
      name: { $ilike: `%${name}%` }
    }, {
      orderBy: { updatedAt: 'DESC' },
      limit,
      offset,
    });

    return toPageDTO(findAndCount, page, limit);
  }
  /**
   * List files and folders combined with pagination
   */
  async listContents(
    userId: number,
    folderId?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<Page<File | Folder>> {
    const { services } = await this.getServices();

    const offset = (page - 1) * limit;

    // Get root folder if folderId not provided
    const rootFolder = await services.folder.findOne({ userId, parentId: null });
    if (!rootFolder) {
      throw new Error('User root folder not found');
    }
    const targetFolderId = folderId ?? rootFolder.id;

    // Fetch both folders and files
    const [folders, files] = await Promise.all([
      services.folder.find(
        { userId, parentId: targetFolderId },
        { orderBy: { createdAt: 'DESC' } }
      ),
      services.file.find(
        { userId, folderId: targetFolderId },
        { orderBy: { createdAt: 'DESC' } }
      )
    ]);

    // Combine and sort by createdAt
    const combined = [...folders, ...files].sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Apply pagination
    const totalElements = combined.length;
    const totalPage = Math.ceil(totalElements / limit);
    const contents = combined.slice(offset, offset + limit);

    return {
      contents,
      currentPage: page,
      perPage: limit,
      totalPage,
      totalElements
    };
  }


  async initMultipartUpload(userId: number, objectKey: string, totalChunks: number) {
    const { services } = await this.getServices();
    const user = await services.user.findOne({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }
    const bucketName = user.bucketName;
    const fileId = crypto.randomUUID();
    return await this.minioService.initMultipartUpload(bucketName, fileId, objectKey, totalChunks);
  }

  async completeMultipartUpload(userId: number, objectKey: string, uploadId: string, parts: {
    PartNumber: number;
    ETag: string;
  }[]) {
    const { services } = await this.getServices();
    const user = await services.user.findOne({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }
    const bucketName = user.bucketName;
    return await this.minioService.completeMultipartUpload(bucketName, objectKey, uploadId, parts);
  }


  async getFolderParentTree(userId: number, folderId?: number): Promise<Folder[]> {
    const { services } = await this.getServices();
    const rootFolder = await services.folder.findOne({ userId, parentId: null });
    if (!rootFolder) {
      throw new Error('User root folder not found');
    }
    if (!folderId) {
      //not provided => root folder (has no parent)
      return []
    }
    const parentFolders = [];
    let currentFolder = await services.folder.findOne({ id: folderId, userId });
    while (currentFolder) {
      parentFolders.push(currentFolder);
      currentFolder = await services.folder.findOne({ id: currentFolder.parentId, userId });
    }
    return parentFolders.reverse();
  }

  async getChildrenFolders(userId: number, folderId?: number): Promise<Folder[]> {
    const { services } = await this.getServices();
    const rootFolder = await services.folder.findOne({ userId, parentId: null });
    if (!rootFolder) {
      throw new Error('User root folder not found');
    }
    const childrenFolders = await services.folder.find({ userId, parentId: folderId ?? rootFolder.id }, { orderBy: { createdAt: 'DESC' } });
    return childrenFolders;
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
