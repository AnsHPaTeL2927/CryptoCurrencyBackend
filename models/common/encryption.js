// models/common/encryption.js
import crypto from 'crypto';
import { promisify } from 'util';

// Convert callback-based crypto functions to promise-based
const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

class Encryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // for AES-256
    this.ivLength = 16;
    this.saltLength = 64;
    this.tagLength = 16;
    this.secret = process.env.ENCRYPTION_KEY || 'your-secret-key';
  }

  // Generate encryption key from password
  async generateKey(salt) {
    return scrypt(this.secret, salt, this.keyLength);
  }

  // Encrypt data
  async encrypt(data) {
    if (!data) return null;

    try {
      // Generate salt and IV
      const salt = await randomBytes(this.saltLength);
      const iv = await randomBytes(this.ivLength);

      // Generate key
      const key = await this.generateKey(salt);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine all components for storage
      const result = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]).toString('base64');

      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data
  async decrypt(encryptedData) {
    if (!encryptedData) return null;

    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = buffer.slice(0, this.saltLength);
      const iv = buffer.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = buffer.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = buffer.slice(this.saltLength + this.ivLength + this.tagLength);

      // Generate key
      const key = await this.generateKey(salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  // Mongoose schema methods
  encryptField(value) {
    return this.encrypt(value);
  }

  decryptField(value) {
    return this.decrypt(value);
  }

  // Create mongoose encryption plugin
  mongooseEncryption(schema, options) {
    const fieldsToEncrypt = options.fields || [];

    fieldsToEncrypt.forEach(field => {
      const fieldConfig = schema.path(field);
      if (!fieldConfig) return;

      schema.pre('save', async function() {
        if (this.isModified(field)) {
          this[field] = await this.constructor.encryption.encrypt(this[field]);
        }
      });

      schema.pre('findOneAndUpdate', async function() {
        const update = this.getUpdate();
        if (update && update[field]) {
          update[field] = await this.model.encryption.encrypt(update[field]);
        }
      });
    });

    // Add decryption methods
    schema.methods.decryptField = async function(field) {
      return await this.constructor.encryption.decrypt(this[field]);
    };
  }
}

// Create singleton instance
const encryption = new Encryption();

// Export encryption methods for direct use
export const encryptField = (value) => encryption.encrypt(value);
export const decryptField = (value) => encryption.decrypt(value);

// Export mongoose plugin
export const encryptionPlugin = (schema, options = {}) => {
  encryption.mongooseEncryption(schema, options);
};

// Export the encryption instance
export default encryption;