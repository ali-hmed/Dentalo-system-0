import { prisma } from '@/lib/db';
import type { CompanyContext, StaffType, MembershipStatus } from '@/lib/types';

export interface UserCompanyDetails extends CompanyContext {
  companyName: string;
  companySlug: string;
  companyStatus: string;
}

export async function getCompanyForUser(userId: string): Promise<UserCompanyDetails | null> {
  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      company: {
        status: {
          not: 'ARCHIVED',
        },
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!membership) {
    return null;
  }

  return {
    companyId: membership.companyId,
    companyName: membership.company.name,
    companySlug: membership.company.slug,
    companyStatus: membership.company.status,
    membership: {
      id: membership.id,
      staffType: membership.staffType as StaffType,
      status: membership.status as MembershipStatus,
    },
  };
}

export async function verifyUserCompanyMembership(
  userId: string,
  companyId: string
): Promise<{ id: string; staffType: StaffType } | null> {
  const membership = await prisma.companyMembership.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    select: {
      id: true,
      staffType: true,
      status: true,
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    return null;
  }

  return {
    id: membership.id,
    staffType: membership.staffType as StaffType,
  };
}
