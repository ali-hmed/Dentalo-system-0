import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/constants';
import type { SessionUser } from '@/lib/types';

export interface ValidatedSession {
  sessionId: string;
  user: SessionUser;
  expiresAt: Date;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await prisma.session.create({
    data: {
      userId,
      token: tokenHash,
      expiresAt,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<ValidatedSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = await prisma.session.findUnique({
      where: { token: tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session expired
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Check if user is active
    if (session.user.status !== 'ACTIVE') {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return {
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as any,
      },
      expiresAt: session.expiresAt,
    };
  } catch (err) {
    console.error('Session validation error:', err);
    return null;
  }
}

export async function invalidateSession(token?: string) {
  try {
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }

    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await prisma.session.deleteMany({
        where: { token: tokenHash },
      });
    }

    await deleteSessionCookie();
  } catch (err) {
    console.error('Session invalidation error:', err);
  }
}

export async function invalidateAllUserSessions(userId: string) {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    });
  } catch (err) {
    console.error('Error invalidating all user sessions:', err);
  }
}
