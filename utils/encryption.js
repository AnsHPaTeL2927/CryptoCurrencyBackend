import crypto from 'crypto';
import { promisify } from 'util';
import { environment } from '../config/environment.js';

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

class EncryptionService {
    constructor() {
        // Encryption settings
        this.ENCRYPTION_KEY = environment.encryptionKey.key; // 32 bytes key
        this.ALGORITHM = environment.encryptionKey.algorithm;
        this.IV_LENGTH = 16;
        this.SALT_LENGTH = 32;
        this.TAG_LENGTH = 16;
        this.KEY_LENGTH = 32;
        this.ENCODING = 'hex';
    }

    /**
     * Encrypt sensitive portfolio data
     * @param {number|string} value - Value to encrypt
     * @returns {string} Encrypted value with IV and auth tag
     */
    async encryptData(value) {
        try {
            // Convert value to string if it's a number
            const stringValue = typeof value === 'number' ? value.toString() : value;
            if (!stringValue) return null;

            // Generate salt and IV
            const salt = await randomBytes(this.SALT_LENGTH);
            const iv = await randomBytes(this.IV_LENGTH);

            // Generate key using salt
            const key = await scrypt(this.ENCRYPTION_KEY, salt, this.KEY_LENGTH);

            // Create cipher
            const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

            // Encrypt the data
            let encrypted = cipher.update(stringValue, 'utf8', this.ENCODING);
            encrypted += cipher.final(this.ENCODING);

            // Get auth tag
            const authTag = cipher.getAuthTag();

            // Combine all components: salt:iv:authTag:encryptedData
            return `${salt.toString(this.ENCODING)}:${iv.toString(this.ENCODING)}:${authTag.toString(this.ENCODING)}:${encrypted}`;

        } catch (error) {
            console.error('Encryption error:', error.message);
            throw new Error('Encryption failed');
        }
    }

    /**
     * Decrypt portfolio data
     * @param {string} encryptedValue - Encrypted value to decrypt
     * @returns {string|number} Decrypted value
     */
    async decryptData(encryptedValue) {
        try {
            if (!encryptedValue || typeof encryptedValue !== 'string') return encryptedValue;

            // Split components
            const [saltHex, ivHex, authTagHex, encryptedHex] = encryptedValue.split(':');

            // Convert components back to buffers
            const salt = Buffer.from(saltHex, this.ENCODING);
            const iv = Buffer.from(ivHex, this.ENCODING);
            const authTag = Buffer.from(authTagHex, this.ENCODING);
            const encrypted = Buffer.from(encryptedHex, this.ENCODING);

            // Generate key using same salt
            const key = await scrypt(this.ENCRYPTION_KEY, salt, this.KEY_LENGTH);

            // Create decipher
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            // Decrypt data
            let decrypted = decipher.update(encrypted, this.ENCODING, 'utf8');
            decrypted += decipher.final('utf8');

            // Convert back to number if it was a number
            return !isNaN(decrypted) ? parseFloat(decrypted) : decrypted;

        } catch (error) {
            console.error('Decryption error:', error.message);
            throw new Error('Decryption failed');
        }
    }

    /**
     * Generate secure hash for data integrity verification
     * @param {Object} data - Data to hash
     * @returns {string} Hash of the data
     */
    async generateDataHash(data) {
        try {
            const hash = crypto.createHash('sha256');
            hash.update(typeof data === 'string' ? data : JSON.stringify(data));
            return hash.digest(this.ENCODING);
        } catch (error) {
            console.error('Hash generation error:', error.message);
            throw new Error('Hash generation failed');
        }
    }

    /**
     * Verify data integrity using hash
     * @param {Object} data - Data to verify
     * @param {string} hash - Hash to verify against
     * @returns {boolean} Whether data is valid
     */
    async verifyDataIntegrity(data, hash) {
        try {
            const computedHash = await this.generateDataHash(data);
            return crypto.timingSafeEqual(
                Buffer.from(computedHash, this.ENCODING),
                Buffer.from(hash, this.ENCODING)
            );
        } catch (error) {
            console.error('Verification error:', error.message);
            return false;
        }
    }

    /**
     * Encrypt sensitive portfolio object
     * @param {Object} portfolioData - Portfolio data to encrypt
     * @returns {Object} Encrypted portfolio data
     */
    async encryptPortfolioData(portfolioData) {
        try {
            const encryptedData = { ...portfolioData };

            // Encrypt sensitive fields
            if (encryptedData.totalValue) {
                encryptedData.totalValue = await this.encryptData(encryptedData.totalValue);
            }

            if (encryptedData.assets) {
                encryptedData.assets = await Promise.all(
                    encryptedData.assets.map(async (asset) => ({
                        ...asset,
                        costBasis: await this.encryptData(asset.costBasis),
                        value: await this.encryptData(asset.value)
                    }))
                );
            }

            return encryptedData;
        } catch (error) {
            console.error('Portfolio encryption error:', error.message);
            throw new Error('Portfolio encryption failed');
        }
    }
}

export default new EncryptionService();