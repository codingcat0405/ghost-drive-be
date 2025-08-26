import {Elysia} from "elysia";
import jwt from "jsonwebtoken";
/*
* Starting from Elysia 1.2.10, each property in the macro object can be a function or an object.
* If the property is an object, it will be translated to a function that accept a boolean parameter,
* and will be executed if the parameter is true.
*/
const authMacro = new Elysia()
  .macro({
    checkAuth(roles: string[]) {
      return {
        resolve({headers, error}) {
          const token = headers.authorization
          if (!token) {
            throw new Error('Token not found')
          }
          const jwtToken = token.split(" ")[1]
          const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET ?? "") as {
            id: number,
            role: string
          }
          const user = {
            id: decoded.id,
            role: decoded.role
          }
          if (!roles.includes(user.role)) {
            throw new Error('Permission denied')
          }
          return {user}
        }
      }
    },
  })

export default authMacro;