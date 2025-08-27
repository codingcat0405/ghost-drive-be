import { Elysia } from 'elysia';
import { initORM } from '../db';
import { File } from '../entities/File';
import { User } from '../entities/User';
import { CryptoUtils } from '../utils/crypto';
import { MinioService } from './MinioService';

export class FileService {
  private minioService: MinioService;

  constructor() {
    this.minioService = new MinioService();
  }

  async uploadFile(
    userId: number,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    pin: string
  ): Promise<File> {
    const db = await initORM();

    try {
      // 1. Find the user
      const user = await db.user.findOne({ id: BigInt(userId) });
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Generate random AES key for this file
      const aesKey = CryptoUtils.generateAESKey();
      console.log('🔑 Generated AES key for file encryption');

      // 3. Encrypt the file data with AES key
      const encryptedFileBuffer = CryptoUtils.encryptFileData(fileBuffer, aesKey);
      console.log('🔒 File data encrypted with AES key');

      // 4. Encrypt the AES key with user's PIN
      const encryptedAESKey = CryptoUtils.encryptAESKeyWithPIN(aesKey, pin);
      console.log('🔐 AES key encrypted with user PIN');

      // 5. Upload encrypted file to MinIO
      const minioPath = await this.minioService.uploadFile(
        originalName,
        encryptedFileBuffer,
        mimeType
      );
      console.log('☁️ Encrypted file uploaded to MinIO');

      // 6. Save file metadata to database
      const fileEntity = db.em.create(File, {
        filename: minioPath,
        originalName,
        mimeType,
        fileSize: fileBuffer.length,
        encryptedAESKey,
        minioPath,
        owner: user,
      });

      await db.em.persistAndFlush(fileEntity);
      console.log('💾 File metadata saved to database');

      return fileEntity;
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadFile(fileId: number, userId: number, pin: string): Promise<{
    fileBuffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const db = await initORM();

    try {
      // 1. Find the file and verify ownership
      const file = await db.file.findOne(
        { id: BigInt(fileId), owner: { id: BigInt(userId) } },
        { populate: ['owner'] }
      );

      if (!file) {
        throw new Error('File not found or access denied');
      }

      // 2. Decrypt AES key with user's PIN
      const aesKey = CryptoUtils.decryptAESKeyWithPIN(file.encryptedAESKey, pin);
      console.log('🔓 AES key decrypted with user PIN');

      // 3. Download encrypted file from MinIO
      const encryptedFileBuffer = await this.minioService.downloadFile(file.minioPath);
      console.log('☁️ Encrypted file downloaded from MinIO');

      // 4. Decrypt file data with AES key
      const fileBuffer = CryptoUtils.decryptFileData(encryptedFileBuffer, aesKey);
      console.log('🔓 File data decrypted with AES key');

      return {
        fileBuffer,
        filename: file.originalName,
        mimeType: file.mimeType,
      };
    } catch (error) {
      console.error('❌ File download failed:', error);
      throw new Error(`File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserFiles(userId: number): Promise<File[]> {
    const db = await initORM();

    try {
      const files = await db.file.find(
        { owner: { id: BigInt(userId) } },
        { populate: ['owner'] }
      );

      return files;
    } catch (error) {
      console.error('❌ Failed to get user files:', error);
      throw new Error('Failed to retrieve user files');
    }
  }

  async deleteFile(fileId: number, userId: number): Promise<void> {
    const db = await initORM();

    try {
      // 1. Find the file and verify ownership
      const file = await db.file.findOne(
        { id: BigInt(fileId), owner: { id: BigInt(userId) } },
        { populate: ['owner'] }
      );

      if (!file) {
        throw new Error('File not found or access denied');
      }

      // 2. Delete from MinIO
      await this.minioService.deleteFile(file.minioPath);
      console.log('🗑️ File deleted from MinIO');

      // 3. Delete from database
      await db.em.removeAndFlush(file);
      console.log('🗑️ File metadata deleted from database');
    } catch (error) {
      console.error('❌ File deletion failed:', error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new Elysia().decorate('fileService', new FileService());
