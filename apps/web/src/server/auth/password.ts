import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const FORMAT = "scrypt";
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(secret: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      secret,
      salt,
      KEY_LENGTH,
      { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: MAX_MEMORY },
      (error, key) => error ? reject(error) : resolve(key as Buffer),
    );
  });
}

async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(secret, salt);
  return [FORMAT, COST, BLOCK_SIZE, PARALLELIZATION, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifySecret(secret: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== FORMAT) return false;
  const [cost, blockSize, parallelization] = parts.slice(1, 4).map(Number);
  if (cost !== COST || blockSize !== BLOCK_SIZE || parallelization !== PARALLELIZATION) return false;

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const actual = await derive(secret, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 512) {
    throw new Error("Teacher password must be between 12 and 512 characters");
  }
  return hashSecret(password);
}

export async function hashPin(pin: string): Promise<string> {
  if (!/^\d{4,12}$/.test(pin)) {
    throw new Error("Student PIN must contain 4 to 12 digits");
  }
  return hashSecret(pin);
}
