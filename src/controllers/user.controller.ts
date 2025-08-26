import {Elysia, t} from "elysia";
import userService from "../services/UserService";
import authMacro from "../macros/auth";

const userController = new Elysia()
  .group("/users", group =>
    group
      .use(userService)
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

  )

export default userController