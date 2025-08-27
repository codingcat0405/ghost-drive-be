import { Client } from 'minio';
import { Elysia } from 'elysia';

export class MinioService {
  private client: Client;
  private bucketName: string;

  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
      secretKey: process.env.MINIO_SECRET_KEY || 'password123',
    });
    
    this.bucketName = process.env.MINIO_BUCKET || 'ghost-drive-files';
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`✅ Created MinIO bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('❌ MinIO bucket initialization failed:', error);
    }
  }

  async uploadFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      const objectName = `${Date.now()}-${fileName}`;
      
      await this.client.putObject(
        this.bucketName,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType,
          'X-Amz-Meta-Upload-Date': new Date().toISOString(),
        }
      );

      console.log(`✅ File uploaded to MinIO: ${objectName}`);
      return objectName;
    } catch (error) {
      console.error('❌ MinIO upload failed:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, objectName);
      
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('❌ MinIO download failed:', error);
      throw new Error('Failed to download file from storage');
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      console.log(`🗑️ File deleted from MinIO: ${objectName}`);
    } catch (error) {
      console.error('❌ MinIO delete failed:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  async getFileInfo(objectName: string) {
    try {
      return await this.client.statObject(this.bucketName, objectName);
    } catch (error) {
      console.error('❌ MinIO stat failed:', error);
      throw new Error('Failed to get file info from storage');
    }
  }
}

export default new Elysia().decorate('minioService', new MinioService());
