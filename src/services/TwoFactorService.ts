import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { initORM } from '../db';

class TwoFactorService {
  /**
   * Setup 2FA for a user (generate secret and QR code)
   */
  async setup2FA(userId: number): Promise<{ qrCode: string }> {
    const db = await initORM();
    const userInDb = await db.user.findOne({ id: userId });
    if (!userInDb) {
      throw new Error("User not found");
    }

    if (userInDb.twoFactorEnabled) {
      throw new Error("2FA already enabled for this user");
    }

    const secret = authenticator.generateSecret();
    userInDb.twoFactorSecret = secret;
    await db.em.persistAndFlush(userInDb);
    
    const otpauth = authenticator.keyuri(userInDb.username, 'GhostDrive', secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    return { qrCode };
  }

  /**
   * Enable 2FA for a user after verifying the token
   */
  async enable2FA(userId: number, token: string): Promise<boolean> {
    const db = await initORM();
    const userInDb = await db.user.findOne({ id: userId });
    if (!userInDb || !userInDb.twoFactorSecret) {
      throw new Error("2FA not set up for this user");
    }

    const isValid = authenticator.check(token, userInDb.twoFactorSecret);
    if (!isValid) {
      return false;
    }

    userInDb.twoFactorEnabled = true;
    await db.em.persistAndFlush(userInDb);
    return true;
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: number): Promise<void> {
    const db = await initORM();
    const userInDb = await db.user.findOne({ id: userId });
    if (!userInDb) {
      throw new Error("User not found");
    }

    userInDb.twoFactorEnabled = false;
    userInDb.twoFactorSecret = undefined;
    await db.em.persistAndFlush(userInDb);
  }

  /**
   * Get 2FA status for a user
   */
  async get2FAStatus(userId: number): Promise<{ enabled: boolean; hasSecret: boolean }> {
    const db = await initORM();
    const userInDb = await db.user.findOne({ id: userId });
    if (!userInDb) {
      throw new Error("User not found");
    }

    return {
      enabled: userInDb.twoFactorEnabled,
      hasSecret: !!userInDb.twoFactorSecret
    };
  }
}

export default TwoFactorService;
