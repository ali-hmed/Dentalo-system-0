import bcrypt from 'bcryptjs';
import { argon2Verify } from 'hash-wasm';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
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

