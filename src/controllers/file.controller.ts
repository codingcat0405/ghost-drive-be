import { Elysia, t } from "elysia";
import authMacro from "../macros/auth";
import FileService from "../services/FileService";
import { File } from "../entities/File";

const fileService = new FileService();
const fileController = new Elysia()
  .group("/files", group =>
    group
      .use(authMacro)
      
      // Get presigned URL for file upload
      .post("/upload-url", async ({ user, body }) => {
        const objectKey = `${user.id}/${Date.now()}_${body.fileName}`;
        const uploadUrl = await fileService.getUploadPresignedUrl(objectKey);
        
        return {
          uploadUrl,
          objectKey,
          expiresIn: 24 * 60 * 60 // 24 hours in seconds
        };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Get presigned URL for file upload",
          security: [{ JwtAuth: [] }],
        },
        body: t.Object({
          fileName: t.String(),
        })
      })
      
      // Get presigned URL for file download
      .get("/download-url/:fileId", async ({ user, params }) => {
        const file = await fileService.getFileById(parseInt(params.fileId), user.id);
        if (!file) {
          throw new Error('File not found');
        }
        
        const downloadUrl = await fileService.getDownloadPresignedUrl(file.objectKey);
        
        return {
          downloadUrl,
          fileName: file.name,
          expiresIn: 24 * 60 * 60 // 24 hours in seconds
        };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Get presigned URL for file download",
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({
          fileId: t.String(),
        })
      })
      
      // Create file record (after successful upload)
      .post("/create", async ({ user, body }) => {
        const fileData = {
          name: body.name,
          objectKey: body.objectKey,
          path: body.path,
          size: body.size,
          mimeType: body.mimeType,
          userId: user.id
        };
        
        const file = await fileService.createFile(fileData);
        return file;
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Create file record after upload",
          security: [{ JwtAuth: [] }],
        },
        body: t.Object({
          name: t.String(),
          objectKey: t.String(),
          path: t.String(),
          size: t.Number(),
          mimeType: t.Optional(t.String()),
        })
      })
      
      // Get file details
      .get("/:fileId", async ({ user, params }) => {
        const file = await fileService.getFileById(parseInt(params.fileId), user.id);
        if (!file) {
          throw new Error('File not found');
        }
        return file;
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Get file details",
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({
          fileId: t.String(),
        })
      })
      
      // Update file (rename, move)
      .put("/:fileId", async ({ user, params, body }) => {
        const file = await fileService.updateFile(
          parseInt(params.fileId), 
          user.id, 
          body
        );
        
        if (!file) {
          throw new Error('File not found');
        }
        
        return file;
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Update file (rename, move)",
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({
          fileId: t.String(),
        }),
        body: t.Object({
          name: t.Optional(t.String()),
          path: t.Optional(t.String()),
        })
      })
      
      // Delete file
      .delete("/:fileId", async ({ user, params }) => {
        const success = await fileService.deleteFile(parseInt(params.fileId), user.id);
        
        if (!success) {
          throw new Error('File not found or could not be deleted');
        }
        
        return { message: 'File deleted successfully' };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Delete file",
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({
          fileId: t.String(),
        })
      })
      
      // List files by directory
      .get("/", async ({ user, query }) => {
        const listQuery = {
          userId: user.id,
          path: query.path,
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 20
        };
        
        return await fileService.listFiles(listQuery);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "List files by directory",
          security: [{ JwtAuth: [] }],
        },
        query: t.Object({
          path: t.Optional(t.String()),
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
        })
      })
      
      // Get directory tree
      .get("/tree/:path(*)", async ({ user, params }) => {
        const path = decodeURIComponent(params.path);
        return await fileService.getDirectoryTree(user.id, path);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Get directory tree",
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({
          path: t.String(),
        })
      })
      
      // Create directory
      .post("/directory", async ({ user, body }) => {
        const directory = await fileService.createDirectory(
          body.name,
          body.path,
          user.id
        );
        
        return directory;
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Create directory",
          security: [{ JwtAuth: [] }],
        },
        body: t.Object({
          name: t.String(),
          path: t.String(),
        })
      })
      
      // Move file to different directory
      .post("/:fileId/move", async ({ user, params, body }) => {
        const file = await fileService.moveFile(
          parseInt(params.fileId),
          user.id,
          body.newPath
        );
        
        if (!file) {
          throw new Error('File not found');
        }
        
        return file;
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Move file to different directory",
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({
          fileId: t.String(),
        }),
        body: t.Object({
          newPath: t.String(),
        })
      })
      
      // Search files
      .get("/search/:query", async ({ user, params, query }) => {
        const searchQuery = decodeURIComponent(params.query);
        const page = query.page ? parseInt(query.page) : 1;
        const limit = query.limit ? parseInt(query.limit) : 20;
        
        // Use the FileService to search files
        const result = await fileService.searchFiles(user.id, searchQuery, page, limit);
        
        return {
          ...result,
          query: searchQuery
        };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Files"],
          summary: "Search files by name or path",
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({
          query: t.String(),
        }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
        })
      })
  );

export default fileController;
