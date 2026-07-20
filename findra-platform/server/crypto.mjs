import crypto from "node:crypto";

// Message bodies are encrypted at rest with AES-256-GCM so a database leak or
// unauthorized query doesn't expose conversation content in plain text.
const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey() {
  const raw = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function encryptText(plainText) {
  const key = getKey();
  if (!key || plainText == null) return plainText;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

// Rows written before MESSAGE_ENCRYPTION_KEY was configured stay plain text
// (no "enc:v1:" prefix) and are returned unchanged instead of failing to decrypt.
export function decryptText(value) {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return "[Encrypted message — MESSAGE_ENCRYPTION_KEY not configured]";
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "[Message could not be decrypted]";
  }
}
