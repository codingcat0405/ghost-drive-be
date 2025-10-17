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
          {
            name: body.name,
            objectKey: body.objectKey,
            size: body.size,
            userId: user.id,
            mimeType: body.mimeType,
            folderId: body.folderId
          }
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
          folderId: t.Optional(t.Number({ description: "Folder ID" })),
          size: t.Number({ description: "File size in bytes" }),
          mimeType: t.Optional(t.String({ description: "MIME type" }))
        })
      })
      // Get files with pagination
      .get("/", async ({ query, user, fileService }) => {
        return await fileService.listFiles(
          user.id,
          query.folderId ? parseInt(query.folderId) : undefined,
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
          folderId: t.Optional(t.String({ description: "Filter by folder ID" })),
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
          body.folderId
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
          folderId: t.Optional(t.Number({ description: "New folder ID" }))
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
  );

export default fileController;