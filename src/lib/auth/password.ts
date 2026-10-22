import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashStr);
  } catch {
    return false;
  }
}
