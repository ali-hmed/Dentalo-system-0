import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { CompanyLayoutShell } from './layout-shell';

export const dynamic = 'force-dynamic';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  if (session.user.role === 'SUPER_ADMIN') {
    redirect('/admin');
  }

  const companyContext = await getCompanyForUser(session.user.id);

  if (!companyContext) {
    redirect('/login?error=no_company');
  }

  return (
    <CompanyLayoutShell
      userName={session.user.name}
      userEmail={session.user.email}
      companyName={companyContext.companyName}
    >
      {children}
    </CompanyLayoutShell>
  );
}
