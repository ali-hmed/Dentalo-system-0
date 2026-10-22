import bcrypt from 'bcryptjs';
import { argon2id, argon2Verify } from 'hash-wasm';

const ARGON2_CONFIG = {
  iterations: 2,
  memorySize: 19456, // 19 MiB
  hashLength: 32,
  parallelism: 1,
  outputType: 'encoded' as const,
};

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    return await argon2id({
      password,
      salt,
      ...ARGON2_CONFIG,
    });
  } catch {
    // Pure JS fallback in case WASM execution is restricted
    return bcrypt.hash(password, 10);
  }
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  try {
    if (hashStr.startsWith('$argon2')) {
      return await argon2Verify({
        password,
        hash: hashStr,
      });
    }
    return await bcrypt.compare(password, hashStr);
  } catch {
    return false;
  }
}


