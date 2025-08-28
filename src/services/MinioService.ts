import * as Minio from 'minio'
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
    const url = await this.minioClient.presignedPutObject(bucketName, objectKey, this.expirationTime);
    return url;
  }

  /* get presigned url for a download file
  * @param bucketName - the name of the bucket
  * @param objectKey - the key of the object
  * @returns the presigned url
  */
  async getDownloadPresignedUrl(bucketName: string, objectKey: string) {
    const url = await this.minioClient.presignedGetObject(bucketName, objectKey, this.expirationTime);
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
}
export default MinioService;