import * as Minio from 'minio'


export interface MultipartUploadInit {
  uploadId: string;
  fileId: string;
  objectName: string;
}

export interface PartUrl {
  partNumber: number;
  url: string;
}

export interface UploadPart {
  PartNumber: number;
  ETag: string;
}

class MinioService {
  private minioClient: Minio.Client;
  private expirationTime: number;
  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? '',
      port: Number(process.env.MINIO_PORT),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SECRET_KEY ?? '',
      region: 'us-east-1',
    });
    this.expirationTime = 60 * 60 * 24 * 1; // 1 day
  }

  async createBucket(bucketName: string) {
    const exists = await this.minioClient.bucketExists(bucketName);
    if (exists) {
      throw new Error(`Bucket ${bucketName} already exists`);
    }
    await this.minioClient.makeBucket(bucketName, 'us-east-1');
    return bucketName;
  }
  /* get presigned url for a upload file
  * @param bucketName - the name of the bucket
  * @param objectKey - the key of the object this should like a file name
  * @returns the presigned url
  */
  async getUploadPresignedUrl(bucketName: string, objectKey: string) {
    let url = await this.minioClient.presignedPutObject(bucketName, objectKey, this.expirationTime);
    if (Number(process.env.MINIO_PORT) === 80) {
      //remove :80 from the url
      url = url.replace(':80', '');
      url = url.replace('http://', 'https://');
    }
    return url;
  }

  /* get presigned url for a download file
  * @param bucketName - the name of the bucket
  * @param objectKey - the key of the object
  * @returns the presigned url
  */
  async getDownloadPresignedUrl(bucketName: string, objectKey: string) {
    let url = await this.minioClient.presignedGetObject(bucketName, objectKey, this.expirationTime);
    if (Number(process.env.MINIO_PORT) === 80) {
      //remove :80 from the url
      url = url.replace(':80', '');
      url = url.replace('http://', 'https://');
    }
    return url;
  }

  /* delete a file
  * @param bucketName - the name of the bucket
  * @param objectKey - the key of the object
  * @returns true if the object key is deleted
  */
  async deleteFile(bucketName: string, objectKey: string) {
    await this.minioClient.removeObject(bucketName, objectKey);
    return objectKey;
  }

  // ============ MULTIPART UPLOAD METHODS ============

  /**
   * Initialize multipart upload
   * @param bucketName - the name of the bucket
   * @param fileId - unique file identifier
   * @param objectName - The object name in the bucket this should like a file name
   * @param totalChunks - total number of chunks
   * @returns upload metadata with presigned URLs for all parts
   */
  async initMultipartUpload(
    bucketName: string,
    fileId: string,
    objectName: string,
    totalChunks: number
  ): Promise<{
    uploadId: string;
    fileId: string;
    objectName: string;
    partUrls: PartUrl[]
  }> {
    // Initialize multipart upload
    const uploadId = await this.minioClient.initiateNewMultipartUpload(
      bucketName,
      objectName,
      {}
    );

    // Generate presigned URLs for all parts
    const partUrls: PartUrl[] = [];
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      const url = await this.getPartPresignedUrl(
        bucketName,
        objectName,
        uploadId,
        partNumber
      );
      partUrls.push({ partNumber, url });
    }

    return {
      uploadId,
      fileId,
      objectName,
      partUrls
    };
  }

  /**
   * Generate presigned URL for a single part upload
   * @param bucketName - the name of the bucket
   * @param objectName - the object key
   * @param uploadId - multipart upload ID
   * @param partNumber - part number (1-indexed)
   * @returns presigned URL for uploading this part
   */
  async getPartPresignedUrl(
    bucketName: string,
    objectName: string,
    uploadId: string,
    partNumber: number
  ): Promise<string> {
    // MinIO client doesn't have built-in presigned multipart URL method
    // We need to use presignedUrl with custom query params
    let url = await this.minioClient.presignedUrl(
      'PUT',
      bucketName,
      objectName,
      this.expirationTime,
      {
        uploadId: uploadId,
        partNumber: partNumber.toString()
      }
    );

    if (Number(process.env.MINIO_PORT) === 80) {
      url = url.replace(':80', '');
      url = url.replace('http://', 'https://');
    }

    return url;
  }

  /**
   * Complete multipart upload
   * @param bucketName - the name of the bucket
   * @param objectName - the object key
   * @param uploadId - multipart upload ID
   * @param parts - array of uploaded parts with ETags
   * @returns completion result
   */
  async completeMultipartUpload(
    bucketName: string,
    objectName: string,
    uploadId: string,
    parts: UploadPart[]
  ): Promise<{ status: string; objectName: string; etag: string }> {
    // Sort parts by PartNumber to ensure correct order
    const sortedParts = parts
      .sort((a, b) => a.PartNumber - b.PartNumber)
      .map(part => ({
        part: part.PartNumber,
        etag: part.ETag
      }));

    const etag = await this.minioClient.completeMultipartUpload(
      bucketName,
      objectName,
      uploadId,
      sortedParts
    );

    return {
      status: 'completed',
      objectName,
      etag: etag?.etag ?? ""
    };
  }

  /**
   * Abort multipart upload (cleanup on failure)
   * @param bucketName - the name of the bucket
   * @param objectName - the object key
   * @param uploadId - multipart upload ID
   */
  async abortMultipartUpload(
    bucketName: string,
    objectName: string,
    uploadId: string
  ): Promise<void> {
    await this.minioClient.abortMultipartUpload(
      bucketName,
      objectName,
      uploadId
    );
  }

  /**
   * List incomplete multipart uploads (for cleanup/debugging)
   * @param bucketName - the name of the bucket
   * @param prefix - object key prefix (optional)
   * @returns stream of incomplete uploads
   */
  listIncompleteUploads(bucketName: string, prefix?: string) {
    return this.minioClient.listIncompleteUploads(
      bucketName,
      prefix ?? "",
      true
    );
  }
}
export default MinioService;