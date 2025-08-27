import {Elysia, t} from "elysia";
import userService from "../services/UserService";
import fileService from "../services/FileService";
import authMacro from "../macros/auth";

const userController = new Elysia()
  .group("/users", group =>
    group
      .use(userService)
      .use(fileService)
      .use(authMacro)
      .post("/register", async ({body, userService}) => {
        return await userService.register(body.username, body.password)
      }, {
        detail: {
          tags: ["User"],
        },
        body: t.Object({
          username: t.String(),
          password: t.String(),
        })
      })
      .post("/login", async ({body, userService}) => {
        return await userService.login(body.username, body.password)
      }, {
        detail: {
          tags: ["User"],
        },
        body: t.Object({
          username: t.String(),
          password: t.String(),
        })
      })
      .get("/me", async ({user}) => {
        return user
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            {JwtAuth: []}
          ],
        },
      })
      // .use(authMacro)
      .get("/admin", async ({user}) => {
        return user
      }, {
        checkAuth: ['admin'],
        detail: {
          tags: ["User"],
          security: [
            {JwtAuth: []}
          ],
        },
      })
      .post("/upload-file", async ({body, user, fileService}) => {
        return await fileService.uploadFile(
          user.id,
          Buffer.from(body.file),
          body.filename,
          body.mimeType || 'application/octet-stream',
          body.pin
        );
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [
            {JwtAuth: []}
          ],
          description: "Upload and encrypt a file with PIN-based AES encryption"
        },
        body: t.Object({
          file: t.String({description: "Base64 encoded file data"}),
          filename: t.String({description: "Original filename"}),
          mimeType: t.Optional(t.String({description: "MIME type of the file"})),
          pin: t.String({description: "PIN for encrypting the AES key"})
        })
      })
      .get("/files", async ({user, fileService}) => {
        return await fileService.getUserFiles(user.id);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [
            {JwtAuth: []}
          ],
          description: "Get list of user's uploaded files"
        }
      })
      .post("/download-file", async ({body, user, fileService}) => {
        const result = await fileService.downloadFile(body.fileId, user.id, body.pin);
        return {
          filename: result.filename,
          mimeType: result.mimeType,
          data: result.fileBuffer.toString('base64')
        };
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [
            {JwtAuth: []}
          ],
          description: "Download and decrypt a file with PIN"
        },
        body: t.Object({
          fileId: t.Number({description: "ID of the file to download"}),
          pin: t.String({description: "PIN for decrypting the AES key"})
        })
      })
      .delete("/files/:fileId", async ({params, user, fileService}) => {
        await fileService.deleteFile(parseInt(params.fileId), user.id);
        return {message: "File deleted successfully"};
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["File"],
          security: [
            {JwtAuth: []}
          ],
          description: "Delete a file"
        },
        params: t.Object({
          fileId: t.String({description: "ID of the file to delete"})
        })
      })

  )

export default userController