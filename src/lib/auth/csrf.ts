import { headers } from 'next/headers';

/**
 * Validates request origin against allowed host to protect against Cross-Site Request Forgery.
 */
export function verifyCsrfOrigin(): boolean {
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const headersList = headers();
  const origin = headersList.get('origin');
  const host = headersList.get('host');

  if (!origin || !host) {
    // If no origin header is provided (e.g. server-to-server or strict browser), check referer
    const referer = headersList.get('referer');
    if (!referer) return true; // Direct navigation or non-browser client
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
