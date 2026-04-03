import crypto from 'node:crypto';

/**
 * AES-256-GCM encryption utility for health data at rest.
 *
 * Requires ENCRYPTION_KEY env var — a 64-character hex string (32 bytes).
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Usage:
 *   import { encrypt, decrypt } from '../services/encryption.js';
 *   const encrypted = encrypt(JSON.stringify(sensitiveData));
 *   const decrypted = JSON.parse(decrypt(encrypted));
 *
 * Where to apply (document for future integration):
 * - healthProfiles: conditions, medications, allergies, familyHistory fields
 * - biomarkers: value field (or entire row payload)
 * - wearableSummaries: already anonymized, lower priority
 * - wearableDevices: accessToken, refreshToken (currently stored plaintext)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing IV + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: IV (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64-encoded string produced by encrypt().
 * Returns the original plaintext.
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const packed = Buffer.from(encoded, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Check if ENCRYPTION_KEY is configured. Useful for conditional encryption
 * during migration — encrypt if key is set, skip if not.
 */
export function isEncryptionConfigured(): boolean {
  const hex = process.env.ENCRYPTION_KEY;
  return typeof hex === 'string' && hex.length === 64;
}
