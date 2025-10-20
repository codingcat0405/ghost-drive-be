import { Elysia, t } from "elysia";
import authMacro from "../macros/auth";
import UserService from "../services/UserService";

const userService = new UserService();
const userController = new Elysia()
  .group("/users", group =>
    group
      .use(authMacro)
      .post("/register", async ({ body }) => {
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
      .post("/login", async ({ body }) => {
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
      .get("/me", async ({ user }) => {
        return await userService.getUserDetail(user)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            { JwtAuth: [] }
          ],
        },
      })
      .post("/upload-aes-key-encrypted", async ({ user, body }) => {
        return await userService.uploadAESKeyEncrypted(user, body.aesKeyEncrypted)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            { JwtAuth: [] }
          ],
        },
        body: t.Object({
          aesKeyEncrypted: t.String(),
        })
      })
      .get("/get-aes-key-encrypted", async ({ user }) => {
        return await userService.getAESKeyEncrypted(user)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            { JwtAuth: [] }
          ],
        },
      })
      .post("/update-aes-key-encrypted", async ({ user, body }) => {
        return await userService.updateAESKeyEncrypted(user, body.aesKeyEncrypted)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            { JwtAuth: [] }
          ],
        },
        body: t.Object({
          aesKeyEncrypted: t.String(),
        })
      })
      .put("/", async ({ user, body }) => {
        return await userService.updateUser(user, body)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            { JwtAuth: [] }
          ],
        },
        body: t.Object({
          avatar: t.Optional(t.String()),
          fullName: t.Optional(t.String()),
          email: t.Optional(t.String())
        })
      })

      .put("/update-password", async ({ user, body }) => {
        return await userService.updatePassword(user, body.oldPassword, body.newPassword)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            { JwtAuth: [] }
          ],
        },
        body: t.Object({
          oldPassword: t.String(),
          newPassword: t.String()
        })
      })
      .get("/report", async ({ user }) => {
        return await userService.getReport(user)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["User"],
          security: [
            { JwtAuth: [] }
          ],
        },
      })
  )

export default userController