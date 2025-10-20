import { User } from './../entities/User';
import { initORM } from "../db";
import jwt from "jsonwebtoken";
import MinioService from "./MinioService";
import { wrap } from '@mikro-orm/core';

class UserService {
  private readonly minioService: MinioService;

  constructor() {
    this.minioService = new MinioService();
  }

  async register(username: string, password: string) {
    const db = await initORM()
    const existUser = await db.user.findOne({ username })
    if (existUser) {
      throw new Error("User already exists")
    }
    const hashPassword = await Bun.password.hash(password, 'bcrypt')
    const bucketName = `ghostdrive-${username}`
    await this.minioService.createBucket(bucketName)
    const user = db.user.create({
      username,
      password: hashPassword,
      role: "user",
      bucketName
    })
    await db.em.persistAndFlush(user)
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      bucketName: user.bucketName,
      avatar: user.avatar
    }
  }

  async login(username: string, password: string) {
    const db = await initORM()
    const user = await db.user.findOne({ username })
    if (!user) {
      throw new Error("User not found")
    }
    const isValid = await Bun.password.verify(password, user.password, 'bcrypt')
    if (!isValid) {
      throw new Error("Invalid password")
    }
    //generate token
    const token = jwt.sign({ id: Number(user.id), role: user.role }, process.env.JWT_SECRET ?? "")

    return {
      user: {
        id: Number(user.id),
        username: user.username,
        role: user.role,
        bucketName: user.bucketName
      },
      jwt: token
    }
  }

  async getUserDetail(user: User) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    return {
      id: userInDb.id,
      username: userInDb.username,
      role: userInDb.role,
      bucketName: userInDb.bucketName,
      avatar: userInDb.avatar,
      aesKeyEncrypted: userInDb.aesKeyEncrypted
    }
  }

  async uploadAESKeyEncrypted(user: User, aesKeyEncrypted: string) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    userInDb.aesKeyEncrypted = aesKeyEncrypted
    await db.em.persistAndFlush(userInDb)
    return {
      id: userInDb.id,
      username: userInDb.username,
      role: userInDb.role,
      bucketName: userInDb.bucketName,
      aesKeyEncrypted: userInDb.aesKeyEncrypted,
      avatar: userInDb.avatar
    }
  }

  async getAESKeyEncrypted(user: User) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    return userInDb.aesKeyEncrypted
  }

  async updateAESKeyEncrypted(user: User, aesKeyEncrypted: string) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    userInDb.aesKeyEncrypted = aesKeyEncrypted
    await db.em.persistAndFlush(userInDb)
    return {
      id: userInDb.id,
      username: userInDb.username,
      role: userInDb.role,
      bucketName: userInDb.bucketName,
      aesKeyEncrypted: userInDb.aesKeyEncrypted,
      avatar: userInDb.avatar
    }
  }

  async updateAvatar(user: User, avatar: string) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    userInDb.avatar = avatar
    await db.em.persistAndFlush(userInDb)
    return {
      id: userInDb.id,
      username: userInDb.username,
      role: userInDb.role,
      bucketName: userInDb.bucketName,
      avatar: userInDb.avatar
    }
  }


  async updatePassword(user: User, oldPassword: string, newPassword: string) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    const isValid = await Bun.password.verify(oldPassword, userInDb.password, 'bcrypt')
    if (!isValid) {
      throw new Error("Invalid password")
    }
    const hashPassword = await Bun.password.hash(newPassword, 'bcrypt')
    userInDb.password = hashPassword
    await db.em.persistAndFlush(userInDb)
    return {
      id: userInDb.id,
      username: userInDb.username,
      role: userInDb.role,
      bucketName: userInDb.bucketName,
      avatar: userInDb.avatar,
      aesKeyEncrypted: userInDb.aesKeyEncrypted,

      fullN
    }
  }

}
export default UserService;