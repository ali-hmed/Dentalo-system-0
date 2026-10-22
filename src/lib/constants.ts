// Application-wide constants

export const APP_NAME = 'Dentalo';
export const APP_TIMEZONE = 'Africa/Mogadishu';

// Session
export const SESSION_COOKIE_NAME = 'dentalo_session';
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

// Invitation
export const INVITATION_EXPIRY_HOURS = 72;

// Support access
export const SUPPORT_SESSION_MAX_MINUTES = 30;

// Rate limiting
export const RATE_LIMIT_LOGIN = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// Pagination
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Appointment
export const APPOINTMENT_SLOT_MINUTES = 30;
export const WORKING_HOURS = {
  start: 8, // 8 AM
  end: 18, // 6 PM
};

// Valid state transitions
export const APPOINTMENT_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const VISIT_TRANSITIONS: Record<string, string[]> = {
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};
