// Shared TypeScript types used across the application

export type UserRole = 'SUPER_ADMIN' | 'COMPANY_OWNER' | 'COMPANY_STAFF';

export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PENDING_SETUP';

export type StaffType = 'OWNER' | 'DENTIST' | 'RECEPTIONIST' | 'HYGIENIST' | 'ASSISTANT';

export type MembershipStatus = 'ACTIVE' | 'INACTIVE';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type AppointmentType =
  | 'CHECKUP'
  | 'TREATMENT'
  | 'EMERGENCY'
  | 'CONSULTATION'
  | 'FOLLOW_UP';

export type VisitStatus = 'IN_PROGRESS' | 'COMPLETED';

export type TreatmentStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

export type PatientGender = 'MALE' | 'FEMALE' | 'OTHER';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

// Session user context available after authentication
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Company context for tenant-scoped operations
export interface CompanyContext {
  companyId: string;
  membership: {
    id: string;
    staffType: StaffType;
    status: MembershipStatus;
  };
}

// Combined auth context
export interface AuthContext {
  user: SessionUser;
  company?: CompanyContext;
}

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Action response pattern
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Statistics
export interface StatItem {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
  href?: string;
}
