/**
 * Tool Authentication Manager
 * Handles secure storage and retrieval of tool credentials
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

interface StoredCredential {
  userId: string;
  toolId: string;
  encryptedData: string;
  iv: string;
  createdAt: string;
}

export class ToolAuthManager {
  private key: Buffer;
  private credentials: Map<string, StoredCredential> = new Map();

  constructor(encryptionKey: string) {
    // Derive a consistent key from the provided key
    this.key = scryptSync(encryptionKey, "salt", KEY_LENGTH);
  }

  /**
   * Encrypt data
   */
  private encrypt(data: string): { encrypted: string; iv: string } {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return {
      encrypted,
      iv: iv.toString("hex"),
    };
  }

  /**
   * Decrypt data
   */
  private decrypt(encrypted: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Store credentials for a tool
   */
  async storeCredentials(
    userId: string,
    toolId: string,
    credentials: Record<string, any>
  ): Promise<void> {
    const key = `${userId}:${toolId}`;
    const { encrypted, iv } = this.encrypt(JSON.stringify(credentials));
    
    this.credentials.set(key, {
      userId,
      toolId,
      encryptedData: encrypted,
      iv,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Get credentials for a tool
   */
  async getCredentials(
    userId: string,
    toolId: string
  ): Promise<Record<string, any> | null> {
    const key = `${userId}:${toolId}`;
    const stored = this.credentials.get(key);
    
    if (!stored) {
      return null;
    }

    try {
      const decrypted = this.decrypt(stored.encryptedData, stored.iv);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Delete credentials for a tool
   */
  async deleteCredentials(userId: string, toolId: string): Promise<void> {
    const key = `${userId}:${toolId}`;
    this.credentials.delete(key);
  }

  /**
   * Check if credentials exist
   */
  async hasCredentials(userId: string, toolId: string): Promise<boolean> {
    const key = `${userId}:${toolId}`;
    return this.credentials.has(key);
  }

  /**
   * Get all tool IDs with stored credentials for a user
   */
  async getUserToolIds(userId: string): Promise<string[]> {
    const toolIds: string[] = [];
    for (const [key, cred] of this.credentials) {
      if (cred.userId === userId) {
        toolIds.push(cred.toolId);
      }
    }
    return toolIds;
  }
}
