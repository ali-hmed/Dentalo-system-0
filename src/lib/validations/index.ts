import { z } from 'zod';

// ─── AUTH & ACCOUNT ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const setupAccountSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SetupAccountInput = z.infer<typeof setupAccountSchema>;

// ─── COMPANY & ONBOARDING ───────────────────────────────────────────────────

export const createCompanySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  email: z.string().trim().email('Valid company contact email is required'),
  phone: z.string().trim().min(6, 'Valid phone number is required'),
  address: z.string().trim().min(2, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
  ownerName: z.string().trim().min(2, 'Owner name is required'),
  ownerEmail: z.string().trim().email('Valid owner email is required'),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required').max(100),
  phone: z.string().trim().min(6, 'Valid phone number is required'),
  email: z.string().trim().email('Valid email is required'),
  address: z.string().trim().min(2, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ─── STAFF MANAGEMENT ───────────────────────────────────────────────────────

export const inviteStaffSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  staffType: z.enum(['DENTIST', 'RECEPTIONIST', 'HYGIENIST', 'ASSISTANT'], {
    errorMap: () => ({ message: 'Please select a valid staff role' }),
  }),
  specialization: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

// ─── PATIENT ────────────────────────────────────────────────────────────────

export const patientSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  phone: z.string().trim().min(6, 'Phone number is required').max(20),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  medicalHistory: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;

// ─── APPOINTMENT ────────────────────────────────────────────────────────────

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Please select a patient'),
  dentistId: z.string().min(1, 'Please select a dentist'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Invalid start time'),
  endTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Invalid end time'),
  type: z.enum(['CHECKUP', 'TREATMENT', 'EMERGENCY', 'CONSULTATION', 'FOLLOW_UP']),
  notes: z.string().trim().optional(),
  version: z.number().int().positive().optional().default(1),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Invalid start time'),
  endTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Invalid end time'),
  version: z.number().int().positive(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  id: z.string().min(1),
  cancellationReason: z.string().trim().min(3, 'Reason must be at least 3 characters'),
  version: z.number().int().positive(),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

// ─── VISIT & TREATMENT ──────────────────────────────────────────────────────

export const treatmentRecordItemSchema = z.object({
  procedureName: z.string().trim().min(2, 'Procedure name is required'),
  toothNumber: z.string().trim().optional(),
  description: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']).default('COMPLETED'),
});

export const visitSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  dentistId: z.string().min(1, 'Dentist is required'),
  appointmentId: z.string().optional(),
  date: z.string().min(1, 'Visit date is required'),
  chiefComplaint: z.string().trim().optional(),
  examination: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  followUpInstructions: z.string().trim().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED']).default('COMPLETED'),
  version: z.number().int().positive().optional().default(1),
  treatmentRecords: z.array(treatmentRecordItemSchema).optional().default([]),
});

export type VisitInput = z.infer<typeof visitSchema>;

// ─── BREAK-GLASS SUPPORT ACCESS ─────────────────────────────────────────────

export const supportAccessSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  reason: z.string().trim().min(10, 'A detailed reason (at least 10 characters) is required for support audit compliance'),
  ticketReference: z.string().trim().optional(),
});

export type SupportAccessInput = z.infer<typeof supportAccessSchema>;
