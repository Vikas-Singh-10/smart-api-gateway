import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc';
// ENCRYPTION_KEY must be 32 characters long (256 bits)
// ENCRYPTION_IV must be 16 characters long (128 bits)
const encryptionKey = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const iv = process.env.ENCRYPTION_IV || '1234567890123456';

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey), Buffer.from(iv));
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return encrypted.toString('hex');
}

export function decrypt(encryptedText: string): string {
  const encryptedBuffer = Buffer.from(encryptedText, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey), Buffer.from(iv));
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted.toString();
}
