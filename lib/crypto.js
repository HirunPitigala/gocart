import crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SuperSecureAdminPassword123";
// Create a 32-byte (256-bit) key by hashing the ADMIN_PASSWORD to ensure consistent 32-byte length
const ENCRYPTION_KEY = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a text string using AES-256-CBC
 * @param {string} text 
 * @returns {string}
 */
export function encryptPassword(text) {
    if (!text) return "";
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts an encrypted text string using AES-256-CBC
 * @param {string} encryptedText 
 * @returns {string}
 */
export function decryptPassword(encryptedText) {
    if (!encryptedText) return "";
    try {
        const textParts = encryptedText.split(":");
        if (textParts.length < 2) {
            // Not in encrypted format, return as is (could be legacy plain text password)
            return encryptedText;
        }
        const iv = Buffer.from(textParts.shift(), "hex");
        const encrypted = textParts.join(":");
        const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (err) {
        console.error("Decryption error:", err);
        // Return original if decryption fails (safeguard for legacy plain text passwords)
        return encryptedText;
    }
}
