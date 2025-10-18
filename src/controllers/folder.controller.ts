import { Elysia, t } from "elysia";
import FileService from "../services/FileService";
import authMacro from "../macros/auth";

const folderController = new Elysia()
  .decorate('fileService', new FileService())
  .use(authMacro)
  .group("/folders", group =>
    group
      // Create a new folder record
      .post("/", async ({ body, user, fileService }) => {
        return await fileService.createFolder(body.name, user.id, body.parentId);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "Create a new folder record"
        },
        body: t.Object({
          name: t.String({ description: "Folder name" }),
          parentId: t.Optional(t.Number({ description: "Parent folder ID" }))
        })
      })
      // List folders with pagination
      .get("/", async ({ query, user, fileService }) => {
        return await fileService.listFolders(
          user.id,
          query.parentId ? parseInt(query.parentId) : undefined,
          query.page ? parseInt(query.page) : 1,
          query.limit ? parseInt(query.limit) : 20
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "List folders with pagination"
        },
        query: t.Object({
          parentId: t.Optional(t.String({ description: "Filter by parent folder ID" })),
          page: t.Optional(t.String({ description: "Page number (default: 1)" })),
          limit: t.Optional(t.String({ description: "Items per page (default: 20)" }))
        })
      })
      // Update folder
      .put("/:folderId", async ({ params, body, user, fileService }) => {
        return await fileService.updateFolder(parseInt(params.folderId), user.id, body.name, body.parentId);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "Update folder name or parent ID"
        },
        params: t.Object({
          folderId: t.String({ description: "Folder ID" })
        }),
        body: t.Object({
          name: t.String({ description: "New folder name" }),
          parentId: t.Optional(t.Number({ description: "New parent folder ID" }))
        })
      })
      // Delete folder
      .delete("/:folderId", async ({ params, user, fileService }) => {
        return await fileService.deleteFolder(parseInt(params.folderId), user.id);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "Delete folder"
        },
        params: t.Object({
          folderId: t.String({ description: "Folder ID" })
        })
      })
      // List contents
      .get("/contents", async ({ query, user, fileService }) => {
        return await fileService.listContents(
          user.id,
          query.folderId ? parseInt(query.folderId) : undefined,
          query.page ? parseInt(query.page) : 1,
          query.limit ? parseInt(query.limit) : 20
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "List contents of a folder"
        },
        query: t.Object({
          folderId: t.Optional(t.String({ description: "Folder ID" })),
          page: t.Optional(t.String({ description: "Page number (default: 1)" })),
          limit: t.Optional(t.String({ description: "Items per page (default: 20)" }))
        })
      })
      // Get folder tree
      .get("/parent-tree", async ({ user, fileService, query }) => {
        return await fileService.getFolderParentTree(user.id, query.folderId ? parseInt(query.folderId) : undefined);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "Get folder tree"
        },
        query: t.Object({
          folderId: t.Optional(t.String({ description: "Folder ID" }))
        })
      })
      // Get children folders
      .get("/children", async ({ user, fileService, query }) => {
        return await fileService.getChildrenFolders(user.id, query.folderId ? parseInt(query.folderId) : undefined);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "Get children folders"
        },
        query: t.Object({
          folderId: t.Optional(t.String({ description: "Folder ID" }))
        })
      })
      // Get move destinations
      .get("/move-destinations", async ({ user, fileService, query }) => {
        return await fileService.getMoveDestinations(
          user.id,
          query.type as 'file' | 'folder',
          query.sourceFolderId ? parseInt(query.sourceFolderId) : undefined
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Folder"],
          security: [{ JwtAuth: [] }],
          description: "Get valid destination folders for moving files/folders"
        },
        query: t.Object({
          type: t.String({ description: "Type of item being moved: 'file' or 'folder'" }),
          sourceFolderId: t.Optional(t.String({ description: "Source folder ID to exclude from destinations (only for folders)" }))
        })
      })
  );

export default folderController;