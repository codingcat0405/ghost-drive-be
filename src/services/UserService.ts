import {initORM} from "../db";
import {Elysia} from "elysia";
import jwt from "jsonwebtoken";
import {wrap} from "@mikro-orm/core";

export class UserService {

  async register(username: string, password: string) {
    const db = await initORM()
    const existUser = await db.user.findOne({username})
    if (existUser) {
      throw new Error("User already exists")
    }
    const hashPassword = await Bun.password.hash(password, 'bcrypt')
    const user = db.user.create({
      username,
      password: hashPassword,
      role: "user"
    })
    await db.em.persistAndFlush(user)
    return user
  }

  async login(username: string, password: string) {
    const db = await initORM()
    const user = await db.user.findOne({username})
    if (!user) {
      throw new Error("User not found")
    }
    const isValid = await Bun.password.verify(password, user.password, 'bcrypt')
    if (!isValid) {
      throw new Error("Invalid password")
    }
    //generate token
    const token = jwt.sign({id: Number(user.id), role: user.role}, process.env.JWT_SECRET ?? "")

    return {
      user: {
        id: Number(user.id),
        username: user.username,
        role: user.role
      },
      jwt: token
    }
  }
}

export default new Elysia().decorate('userService', new UserService())