import { Elysia, t } from "elysia";
import FileService from "../services/FileService";
import authMacro from "../macros/auth";

const uploadController = new Elysia()
  .decorate('fileService', new FileService())
  .use(authMacro)
  .group("/upload", group =>
    group
      // Get upload presigned URL
      .post("/upload-url", async ({ body, user, fileService }) => {
        const url = await fileService.getUploadPresignedUrl(body.objectKey, user.id);
        return { uploadUrl: url };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Upload"],
          security: [{ JwtAuth: [] }],
          description: "Get presigned URL for file upload"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the file" })
        })
      })
      .post("/upload-multipart-url", async ({ body, user, fileService }) => {
        return await fileService.initMultipartUpload(user.id, body.objectKey, body.totalChunks);

      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Upload"],
          security: [{ JwtAuth: [] }],
          description: "Get presigned URL for file upload"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the file" }),
          totalChunks: t.Number({ description: "Total number of chunks" })
        })
      })
      .post("/complete-multipart-upload", async ({ body, user, fileService }) => {
        return await fileService.completeMultipartUpload(user.id, body.objectKey, body.uploadId, body.parts);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Upload"],
          security: [{ JwtAuth: [] }],
          description: "Complete multipart upload"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the file" }),
          uploadId: t.String({ description: "Multipart upload ID" }),
          parts: t.Array(t.Object({
            PartNumber: t.Number({ description: "Part number" }),
            ETag: t.String({ description: "ETag" })
          }))
        })
      })
      // Get download presigned URL
      .post("/download-url", async ({ body, user, fileService }) => {
        const url = await fileService.getDownloadPresignedUrl(body.objectKey, user.id);
        return { downloadUrl: url };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Upload"],
          security: [{ JwtAuth: [] }],
          description: "Get presigned URL for file download"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the file" })
        })
      })
      // Get upload presigned URL for common uploads (avatars, etc.) - uses default bucket
      .post("/common/upload-url", async ({ body, fileService }) => {
        return await fileService.getCommonUploadPresignedUrl(body.objectKey);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Upload"],
          security: [{ JwtAuth: [] }],
          description: "Get presigned URL for common file upload (avatars, etc.) - uses default bucket"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the common file" })
        })
      })
  );

export default uploadController;