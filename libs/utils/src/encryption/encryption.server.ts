import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

/**
 * Server-side encryption utilities using Node.js crypto
 * Note: For true E2E encryption, the server should NOT decrypt messages
 * This module is provided for compatibility and testing purposes
 */

export interface EncryptedMessage {
  encryptedData: string // Base64 encoded encrypted data
  iv: string // Base64 encoded initialization vector
  keyId: string // Identifier for the encryption key
  tag: string // Base64 encoded authentication tag
}

/**
 * Encrypt a message using AES-256-GCM
 * Note: This should ideally only be used for server-side operations
 * For true E2E, clients should encrypt/decrypt
 */
export async function encryptMessage(
  message: string,
  keyMaterial: string,
  keyId: string,
): Promise<EncryptedMessage> {
  const key = Buffer.from(keyMaterial, 'base64')
  const iv = randomBytes(12) // 96 bits for GCM

  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(message, 'utf8'),
    cipher.final(),
  ])

  const tag = cipher.getAuthTag()

  return {
    encryptedData: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    keyId,
    tag: tag.toString('base64'),
  }
}

/**
 * Decrypt a message using AES-256-GCM
 * Note: This should ideally only be used for server-side operations
 * For true E2E, clients should encrypt/decrypt
 */
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  keyMaterial: string,
): Promise<string> {
  const key = Buffer.from(keyMaterial, 'base64')
  const iv = Buffer.from(encryptedMessage.iv, 'base64')
  const encrypted = Buffer.from(encryptedMessage.encryptedData, 'base64')
  const tag = Buffer.from(encryptedMessage.tag, 'base64')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Generate a random encryption key (Base64 encoded)
 */
export function generateKeyMaterial(): string {
  return randomBytes(32).toString('base64') // 256 bits
}

/**
 * Generate a key ID
 */
export function generateKeyId(): string {
  return randomBytes(16).toString('hex')
}


