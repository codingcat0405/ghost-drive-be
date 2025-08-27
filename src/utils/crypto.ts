import { randomBytes, createCipheriv, createDecipheriv, createHash, pbkdf2Sync } from 'node:crypto';
import * as forge from 'node-forge';

export class CryptoUtils {
  
  /**
   * Generate a random AES-256 key
   */
  static generateAESKey(): string {
    return randomBytes(32).toString('hex'); // 256-bit key
  }

  /**
   * Generate a random salt for PBKDF2
   */
  static generateSalt(): string {
    return randomBytes(16).toString('hex'); // 128-bit salt
  }

  /**
   * Derive encryption key from PIN using PBKDF2
   */
  static deriveKeyFromPIN(pin: string, salt: string): Buffer {
    return pbkdf2Sync(pin, salt, 100000, 32, 'sha256'); // 100k iterations, 256-bit key
  }

  /**
   * Encrypt AES key with user's PIN using AES-256-GCM
   */
  static encryptAESKeyWithPIN(aesKey: string, pin: string): string {
    try {
      // Generate salt and IV
      const salt = this.generateSalt();
      const iv = randomBytes(12); // 96-bit IV for GCM
      
      // Derive key from PIN
      const key = this.deriveKeyFromPIN(pin, salt);
      
      // Encrypt using AES-256-GCM
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(aesKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine salt + iv + authTag + encrypted data
      const result = salt + iv.toString('hex') + authTag.toString('hex') + encrypted;
      
      return result;
    } catch (error) {
      throw new Error('Failed to encrypt AES key with PIN');
    }
  }

  /**
   * Decrypt AES key with user's PIN using AES-256-GCM
   */
  static decryptAESKeyWithPIN(encryptedData: string, pin: string): string {
    try {
      // Extract components
      const salt = encryptedData.slice(0, 32); // 16 bytes = 32 hex chars
      const iv = Buffer.from(encryptedData.slice(32, 56), 'hex'); // 12 bytes = 24 hex chars
      const authTag = Buffer.from(encryptedData.slice(56, 88), 'hex'); // 16 bytes = 32 hex chars
      const encrypted = encryptedData.slice(88);
      
      // Derive key from PIN
      const key = this.deriveKeyFromPIN(pin, salt);
      
      // Decrypt using AES-256-GCM
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Invalid PIN or corrupted key');
    }
  }

  /**
   * Encrypt file data with AES key using AES-256-GCM
   */
  static encryptFileData(fileBuffer: Buffer, aesKey: string): Buffer {
    try {
      const key = Buffer.from(aesKey, 'hex');
      const iv = randomBytes(12); // 96-bit IV for GCM
      
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error) {
      throw new Error('Failed to encrypt file data');
    }
  }

  /**
   * Decrypt file data with AES key using AES-256-GCM
   */
  static decryptFileData(encryptedBuffer: Buffer, aesKey: string): Buffer {
    try {
      const key = Buffer.from(aesKey, 'hex');
      
      // Extract components
      const iv = encryptedBuffer.subarray(0, 12); // 12 bytes IV
      const authTag = encryptedBuffer.subarray(12, 28); // 16 bytes auth tag
      const encrypted = encryptedBuffer.subarray(28); // Rest is encrypted data
      
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt file data');
    }
  }

  /**
   * Generate a secure hash of data using SHA-256
   */
  static generateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity using HMAC-SHA256
   */
  static generateHMAC(data: string, key: string): string {
    const hmac = forge.hmac.create();
    hmac.start('sha256', key);
    hmac.update(data);
    return hmac.digest().toHex();
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, signature: string, key: string): boolean {
    const expectedSignature = this.generateHMAC(data, key);
    return signature === expectedSignature;
  }
}
