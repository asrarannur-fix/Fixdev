import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(secret: string) {
  if (!secret) throw new Error("Kunci enkripsi PIN servis belum dikonfigurasi.");
  return createHash("sha256").update(secret).digest();
}

export function encryptScreenLockPin(pin: string, secret = process.env.SERVICE_PIN_ENCRYPTION_KEY || ""): string {
  if (!pin) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(pin, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptScreenLockPin(value: string, secret = process.env.SERVICE_PIN_ENCRYPTION_KEY || ""): string {
  if (!value) return "";
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) return value;
  const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function redactScreenLockPin<T extends Record<string, any>>(ticket: T): T {
  const { screen_lock_pin, screenLockPin, ...safe } = ticket;
  return safe as T;
}
