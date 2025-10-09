import { Elysia, t } from "elysia";
import FileService from "../services/FileService";
import authMacro from "../macros/auth";

const fileController = new Elysia()
  .decorate('fileService', new FileService())
  .use(authMacro)
  .group("/files", group =>
    group
      // Create a new file record
      .post("/", async ({ body, user, fileService }) => {
        return await fileService.createFile(
          body.name,
          body.objectKey,
          body.path,
          body.size,
          user.id,
          body.mimeType
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Create a new file record"
        },
        body: t.Object({
          name: t.String({ description: "File name" }),
          objectKey: t.String({ description: "S3 object key" }),
          path: t.String({ description: "File path (must start with /)" }),
          size: t.Number({ description: "File size in bytes" }),
          mimeType: t.Optional(t.String({ description: "MIME type" }))
        })
      })

      // Get files with pagination
      .get("/", async ({ query, user, fileService }) => {
        return await fileService.listFiles(
          user.id,
          query.path,
          query.page ? parseInt(query.page) : 1,
          query.limit ? parseInt(query.limit) : 20
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "List files with pagination"
        },
        query: t.Object({
          path: t.Optional(t.String({ description: "Filter by path" })),
          page: t.Optional(t.String({ description: "Page number (default: 1)" })),
          limit: t.Optional(t.String({ description: "Items per page (default: 20)" }))
        })
      })

      // Get file by ID
      .get("/:fileId", async ({ params, user, fileService }) => {
        const file = await fileService.getFileById(parseInt(params.fileId), user.id);
        if (!file) {
          throw new Error('File not found');
        }
        return file;
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Get file by ID"
        },
        params: t.Object({
          fileId: t.String({ description: "File ID" })
        })
      })

      // Update file
      .put("/:fileId", async ({ params, body, user, fileService }) => {
        const file = await fileService.updateFile(
          parseInt(params.fileId),
          user.id,
          body.name,
          body.path
        );
        if (!file) {
          throw new Error('File not found');
        }
        return file;
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Update file name or path"
        },
        params: t.Object({
          fileId: t.String({ description: "File ID" })
        }),
        body: t.Object({
          name: t.Optional(t.String({ description: "New file name" })),
          path: t.Optional(t.String({ description: "New file path" }))
        })
      })

      // Delete file
      .delete("/:fileId", async ({ params, user, fileService }) => {
        const success = await fileService.deleteFile(parseInt(params.fileId), user.id);
        if (!success) {
          throw new Error('File not found or could not be deleted');
        }
        return { message: 'File deleted successfully' };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Delete file"
        },
        params: t.Object({
          fileId: t.String({ description: "File ID" })
        })
      })

      // Search files
      .get("/search", async ({ query, user, fileService }) => {
        return await fileService.searchFiles(
          user.id,
          query.q,
          query.page ? parseInt(query.page) : 1,
          query.limit ? parseInt(query.limit) : 20
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Search files by name or path"
        },
        query: t.Object({
          q: t.String({ description: "Search query" }),
          page: t.Optional(t.String({ description: "Page number (default: 1)" })),
          limit: t.Optional(t.String({ description: "Items per page (default: 20)" }))
        })
      })

      // Get upload presigned URL
      .post("/upload-url", async ({ body, user, fileService }) => {
        const url = await fileService.getUploadPresignedUrl(body.objectKey, user.id);
        return { uploadUrl: url };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Get presigned URL for file upload"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the file" })
        })
      })

      .post("/upload-multipart-url", async ({ body, user, fileService }) => {
        const url = await fileService.initMultipartUpload(user.id, body.objectKey, body.totalChunks);
        return { uploadUrl: url };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Get presigned URL for file upload"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the file" }),
          totalChunks: t.Number({ description: "Total number of chunks" })
        })
      })
      .post("/complete-multipart-upload", async ({ body, user, fileService }) => {
        const url = await fileService.completeMultipartUpload(user.id, body.objectKey, body.uploadId, body.parts);
        return { uploadUrl: url };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
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
          tags: ["File"],
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
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Get presigned URL for common file upload (avatars, etc.) - uses default bucket"
        },
        body: t.Object({
          objectKey: t.String({ description: "S3 object key for the common file" })
        })
      })

      // Get directory tree
      .get("/tree", async ({ query, user, fileService }) => {
        return await fileService.getDirectoryTree(
          user.id,
          query.path,
          query.page ? parseInt(query.page) : 1,
          query.limit ? parseInt(query.limit) : 20
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [{ JwtAuth: [] }],
          description: "Get directory tree with pagination (non-recursive listing)"
        },
        query: t.Object({
          path: t.Optional(t.String({ description: "Root path (default: /)" })),
          page: t.Optional(t.String({ description: "Page number (default: 1)" })),
          limit: t.Optional(t.String({ description: "Items per page (default: 20)" }))
        })
      })
  );

export default fileController;