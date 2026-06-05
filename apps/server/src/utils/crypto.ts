import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ALGORITHM = 'aes-256-gcm';
const KEY_PATH = path.join(os.homedir(), '.nimstudio', 'master.key');

let masterKey: Buffer | null = null;

export function initializeCrypto(): Buffer {
  if (masterKey) return masterKey;

  const dir = path.dirname(KEY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  if (fs.existsSync(KEY_PATH)) {
    masterKey = fs.readFileSync(KEY_PATH);
    if (masterKey.length !== 32) {
      throw new Error("Master key at ~/.nimstudio/master.key is invalid. Must be exactly 32 bytes for AES-256.");
    }
  } else {
    masterKey = crypto.randomBytes(32);
    fs.writeFileSync(KEY_PATH, masterKey, { mode: 0o600 });
  }

  return masterKey;
}

export function encrypt(text: string) {
  const key = initializeCrypto();
  const iv = crypto.randomBytes(12); // 96-bit IV is standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encryptedKey = cipher.update(text, 'utf8', 'hex');
  encryptedKey += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedKey,
    iv: iv.toString('hex'),
    authTag
  };
}

export function decrypt(encryptedKey: string, ivHex: string, authTagHex: string): string {
  const key = initializeCrypto();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
