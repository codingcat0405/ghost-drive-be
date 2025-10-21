import { User } from '../entities/User';
import { initORM } from "../db";
import jwt from "jsonwebtoken";
import MinioService from "./MinioService";
import TwoFactorService from "./TwoFactorService";
import { AuthUser } from "../interfaces/index";

class UserService {
  private readonly minioService: MinioService;
  private readonly twoFactorService: TwoFactorService;

  constructor() {
    this.minioService = new MinioService();
    this.twoFactorService = new TwoFactorService();
  }

  async register(username: string, password: string) {
    const db = await initORM()
    const existUser = await db.user.findOne({ username })
    if (existUser) {
      throw new Error("User already exists")
    }
    const hashPassword = await Bun.password.hash(password, 'bcrypt')
    const bucketName = `ghostdrive-${username.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')}`
    await this.minioService.createBucket(bucketName)
    const user = db.user.create({
      username,
      password: hashPassword,
      role: "user",
      bucketName,
      twoFactorEnabled: false
    })
    await db.em.persistAndFlush(user)
    //create root folder for user
    const rootFolder = db.folder.create({
      name: "/",
      userId: user.id
    })
    await db.em.persistAndFlush(rootFolder)
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      bucketName: user.bucketName,
      avatar: user.avatar,
      storageQuota: user.storageQuota
    }
  }

  async login(username: string, password: string, twoFactorToken?: string) {
    const db = await initORM()
    const user = await db.user.findOne({ username })
    if (!user) {
      throw new Error("User not found")
    }
    const isValid = await Bun.password.verify(password, user.password, 'bcrypt')
    if (!isValid) {
      throw new Error("Invalid password")
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return {
          requiresTwoFactor: true,
          message: "2FA token required"
        }
      }

      if (!user.twoFactorSecret) {
        throw new Error("2FA is enabled but no secret found")
      }

      const is2FAValid = this.twoFactorService.verifyToken(twoFactorToken, user.twoFactorSecret)
      if (!is2FAValid) {
        throw new Error("Invalid 2FA token")
      }
    }

    //generate token
    const token = jwt.sign({ id: Number(user.id), role: user.role }, process.env.JWT_SECRET ?? "")

    return {
      user: {
        id: Number(user.id),
        username: user.username,
        role: user.role,
        bucketName: user.bucketName,
        aesKeyEncrypted: user.aesKeyEncrypted,
        avatar: user.avatar,
        fullName: user.fullName,
        email: user.email,
        storageQuota: user.storageQuota,
        twoFactorEnabled: user.twoFactorEnabled
      },
      jwt: token
    }
  }

  async getUserDetail(user: AuthUser) {
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
      aesKeyEncrypted: userInDb.aesKeyEncrypted,
      fullName: userInDb.fullName,
      email: userInDb.email,
      storageQuota: userInDb.storageQuota,
      twoFactorEnabled: userInDb.twoFactorEnabled
    }
  }

  async uploadAESKeyEncrypted(user: AuthUser, aesKeyEncrypted: string) {
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
      avatar: userInDb.avatar,
      fullName: userInDb.fullName,
      email: userInDb.email,
      storageQuota: userInDb.storageQuota
    }
  }

  async getAESKeyEncrypted(user: AuthUser) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    return userInDb.aesKeyEncrypted
  }

  async updateAESKeyEncrypted(user: AuthUser, aesKeyEncrypted: string) {
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
      avatar: userInDb.avatar,
      fullName: userInDb.fullName,
      email: userInDb.email,
      storageQuota: userInDb.storageQuota
     }
   }

  async updateUser(user: AuthUser, body: {
    avatar?: string,
    fullName?: string,
    email?: string
  }) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    if (body.avatar) userInDb.avatar = body.avatar
    if (body.fullName) userInDb.fullName = body.fullName
    if (body.email) userInDb.email = body.email
    await db.em.persistAndFlush(userInDb)
    return {
      id: userInDb.id,
      username: userInDb.username,
      role: userInDb.role,
      bucketName: userInDb.bucketName,
      avatar: userInDb.avatar,
      fullName: userInDb.fullName,
      email: userInDb.email,
      storageQuota: userInDb.storageQuota
    }
  }

  async updateAvatar(user: AuthUser, avatar: string) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }
    userInDb.avatar = avatar
    await db.em.persistAndFlush(userInDb)
    return userInDb
  }

  async updatePassword(user: AuthUser, oldPassword: string, newPassword: string) {
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
      fullName: userInDb.fullName,
      email: userInDb.email,
      storageQuota: userInDb.storageQuota
    }
  }

  async getReport(user: AuthUser) {
    const db = await initORM()
    const userInDb = await db.user.findOne({ id: user.id })
    if (!userInDb) {
      throw new Error("User not found")
    }

    const totalStorageQueryResult = await db.em.execute<{ total: string }[]>(
      'SELECT sum(size) as total FROM file WHERE user_id = ?',
      [user.id]
    );
    const totalStorage = totalStorageQueryResult[0].total ? parseInt(totalStorageQueryResult[0].total) : 0;
    const totalStorageImageQueryResult = await db.em.execute<{ total: string }[]>(
      'SELECT sum(size) as total FROM file WHERE user_id = ? AND mime_type ILIKE ?',
      [user.id, 'image/%']
    );
    const totalStorageImage = totalStorageImageQueryResult[0].total ? parseInt(totalStorageImageQueryResult[0].total) : 0;
    const totalStorageVideoQueryResult = await db.em.execute<{ total: string }[]>(
      'SELECT sum(size) as total FROM file WHERE user_id = ? AND mime_type ILIKE ?',
      [user.id, 'video/%']
    );
    const totalStorageVideo = totalStorageVideoQueryResult[0].total ? parseInt(totalStorageVideoQueryResult[0].total) : 0;
    const totalStorageAudioQueryResult = await db.em.execute<{ total: string }[]>(
      'SELECT sum(size) as total FROM file WHERE user_id = ? AND mime_type ILIKE ?',
      [user.id, 'audio/%']
    );
    const totalStorageAudio = totalStorageAudioQueryResult[0].total ? parseInt(totalStorageAudioQueryResult[0].total) : 0;

    const otherStorage = totalStorage - totalStorageImage - totalStorageVideo - totalStorageAudio;

    return {
      totalStorage,
      storageQuota: userInDb.storageQuota,
      totalStorageImage,
      totalStorageVideo,
      totalStorageAudio,
      otherStorage
    }
  }

}
export default UserService;