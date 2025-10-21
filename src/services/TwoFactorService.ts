import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { User } from '../entities/User';
import { initORM } from '../db';

class TwoFactorService {
  private readonly appName = 'Ghost Drive';

  /**
   * Generate a new 2FA secret for a user
   */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate QR code data URL for 2FA setup
   */
  async generateQRCode(username: string, secret: string): Promise<string> {
    const otpauth = authenticator.keyuri(username, this.appName, secret);
    return await QRCode.toDataURL(otpauth);
  }

  /**
   * Verify a 2FA token
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.check(token, secret);
    } catch (error) {
      return false;
    }
  }

  /**
   * Setup 2FA for a user (generate secret and QR code)
   */
  async setup2FA(userId: number): Promise<{ secret: string; qrCode: string }> {
    const db = await initORM();
    const userInDb = await db.user.findOne({ id: userId });
    if (!userInDb) {
      throw new Error("User not found");
    }

    const secret = this.generateSecret();
    const qrCode = await this.generateQRCode(userInDb.username, secret);
    
    // Store the secret temporarily (not enabled yet)
    userInDb.twoFactorSecret = secret;
    await db.em.persistAndFlush(userInDb);

    return { secret, qrCode };
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

    const isValid = this.verifyToken(token, userInDb.twoFactorSecret);
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
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: number): Promise<boolean> {
    const db = await initORM();
    const userInDb = await db.user.findOne({ id: userId });
    return userInDb?.twoFactorEnabled ?? false;
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
