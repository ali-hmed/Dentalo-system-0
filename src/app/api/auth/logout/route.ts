import { redirect } from 'next/navigation';
import { invalidateSession } from '@/lib/auth/session';

export async function POST() {
  await invalidateSession();
  redirect('/login');
}

export async function GET() {
  await invalidateSession();
  redirect('/login');
}
