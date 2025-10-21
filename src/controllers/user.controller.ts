import { Elysia, t } from "elysia";
import authMacro from "../macros/auth";
import UserService from "../services/UserService";
import TwoFactorService from "../services/TwoFactorService";

const userService = new UserService();
const twoFactorService = new TwoFactorService();
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
          summary: "Login with username and password",
          description: "Authenticate user credentials. Returns requiresTwoFactor=true if 2FA is enabled, otherwise returns JWT token."
        },
        body: t.Object({
          username: t.String(),
          password: t.String(),
        })
      })
      .post("/verify-2fa", async ({ body }) => {
        return await userService.verify2FA(body.username, body.token)
      }, {
        detail: {
          tags: ["2FA"],
          summary: "Verify 2FA token and complete login",
          description: "Verify the 2FA token for users with 2FA enabled. Returns JWT token upon successful verification."
        },
        body: t.Object({
          username: t.String(),
          token: t.String(),
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
      .post("/2fa/setup", async ({ user }) => {
        return await twoFactorService.setup2FA(user.id)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["2FA"],
          summary: "Setup 2FA for user",
          description: "Generate 2FA secret and QR code for user to scan",
          security: [
            { JwtAuth: [] }
          ],
        },
      })
      .post("/2fa/enable", async ({ user, body }) => {
        const success = await twoFactorService.enable2FA(user.id, body.token)
        if (!success) {
          throw new Error("Invalid 2FA token")
        }
        return { message: "2FA enabled successfully" }
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["2FA"],
          summary: "Enable 2FA for user",
          description: "Enable 2FA after verifying the token from authenticator app",
          security: [
            { JwtAuth: [] }
          ],
        },
        body: t.Object({
          token: t.String(),
        })
      })
      .post("/2fa/disable", async ({ user }) => {
        await twoFactorService.disable2FA(user.id)
        return { message: "2FA disabled successfully" }
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["2FA"],
          summary: "Disable 2FA for user",
          description: "Disable 2FA and remove secret",
          security: [
            { JwtAuth: [] }
          ],
        },
      })
      .get("/2fa/status", async ({ user }) => {
        return await twoFactorService.get2FAStatus(user.id)
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["2FA"],
          summary: "Get 2FA status",
          description: "Check if 2FA is enabled for the user",
          security: [
            { JwtAuth: [] }
          ],
        },
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