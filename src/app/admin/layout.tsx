import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AdminLayoutShell } from './layout-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/app');
  }

  return (
    <AdminLayoutShell
      userName={session.user.name}
      userEmail={session.user.email}
    >
      {children}
    </AdminLayoutShell>
  );
}
