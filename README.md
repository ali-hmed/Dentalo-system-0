# Dentalo — Multi-Tenant Dental Clinic Management Platform

A modern, production-minded dental clinic management platform tailored for dental practices operating in Somalia. Built with Next.js 14 App Router, TypeScript, PostgreSQL (Neon / `btree_gist`), Prisma ORM, and Tailwind CSS.

---

## 1. Architectural Highlights

- **Multi-Tenant Data Segregation**: Every clinic-owned entity (`Patient`, `Appointment`, `Visit`, `TreatmentRecord`, `StaffProfile`, `CompanyMembership`) belongs strictly to a `companyId`. Queries and mutations automatically enforce this boundary via the Prisma Client `$extends` middleware in `src/lib/db.ts`.
- **Clinical Privacy Boundary**: Super Administrators have **zero** default access to private patient charts, clinical examinations, diagnoses, or treatments. Accessing sensitive tenant records requires an explicit Break-Glass Support Session with a mandatory business justification and ticket reference, logged with `CRITICAL` audit severity (`AUDIT_SUPPORT_OVERRIDE`).
- **Double-Booking Hard Guarantee**: Prevents overlapping appointments for the same dentist using a PostgreSQL Exclusion Constraint (`btree_gist` with `tstzrange`) paired with application-level verification. Time slots released by `CANCELLED` or `NO_SHOW` appointments are automatically reusable.
- **Timezone Awareness**: Timestamps are stored as UTC `timestamptz` and formatted in `Africa/Mogadishu` (UTC+3, no daylight saving time shifts).
- **Optimistic Concurrency Control (OCC)**: Appointments and Visits track a `version Int @default(1)`. Concurrent updates from different devices or clinicians are detected and cleanly rejected with an informative conflict notification.
- **Database-Backed Session Engine**: Cryptographically secure 256-bit random session tokens stored in the database, with HTTP-only, `SameSite=Lax`, `Secure` cookies. Passwords are hash-protected via Argon2id (`@node-rs/argon2`).
- **Resilient Invitations & Copyable Fallback**: Onboarding links are dispatched via Resend, and an in-app one-click copyable fallback link is provided for direct sharing over SMS or WhatsApp.

---

## 2. Design System & Visual Direction

Dentalo follows a calm, trustworthy clinical aesthetic strictly adhering to the design specifications:
- **Background**: Warm White (`#FAF9F6`)
- **Text / Foreground**: Charcoal (`#1F2326`)
- **Borders**: Subtle Gray 1px (`#E4E2DD`)
- **Accent**: Muted Teal (`#1F6F6B`)
- **Typography**: Inter, regular weight by default, medium for titles (18px page titles, 14px body, 12px labels).
- **Joined Statistics Bar**: Single joined horizontal bar with thin 1px dividers rather than separate floating cards. Responsive auto-collapse to 2-column grid on mobile.
- **Touch Targets**: 44px minimum touch targets and native bottom navigation for mobile viewports.

---

## 3. Account Roles & Workspaces

1. **Super Admin Platform (`/admin`)**:
   - Platform Overview: Real statistics (Total Companies, Active, Suspended, Registered Users, 30-Day Appointments, Pending Setup), 6-month monthly registrations chart, status distribution, and "Needs Attention" list.
   - Company Management: Create companies, trigger owner invitations, search, filter, activate, suspend, or archive clinics.
   - Company Details: Profile, members list, volume summary, company-scoped audit trail, and Break-Glass Support Portal.
   - Global User Management: Search users across all clinics, inspect memberships, toggle active/suspended account state.
   - Platform Audit Log: Searchable security and operational events with severity filtering.
   - Platform Settings: Global configurations and security policy declarations.

2. **Dental Company Workspace (`/app`)**:
   - Clinic Dashboard: Real statistics (Today's appointments with completed count, new patients this month, no-show rate, revenue placeholder), 14-day appointment trend chart, treatments breakdown, and real-time waiting queue.
   - Schedule: Day view grouped by dentist in Africa/Mogadishu time with an interactive Patient Side Panel (displaying clinical allergy alerts, contact info, and status transitions).
   - Patients: Registration with duplicate detection (by phone number), patient search, and detailed patient chart.
   - Patient Record (`/app/patients/[id]`): Prominent allergy alert banner, demographic details, tabs for Clinical Visits & History, Scheduled Appointments, and Progress Notes.
   - Treatments (`/app/treatments`): Clinic-wide directory of all performed procedures and tooth numbers.
   - Staff Management (`/app/staff`): Invite dentists, receptionists, hygienists, and assistants with copyable invitation links; deactivate/reactivate staff while preserving clinical history.
   - Clinic Settings: Operational hours, address, and clinic preferences.

---

## 4. Setup & Installation

### Prerequisites
- Node.js 18+ (tested on Node v20/v22)
- PostgreSQL database (e.g. Neon, Supabase, or local Postgres with `btree_gist` support)

### Step 1: Clone & Install Dependencies
```bash
cd Dentalo-system-0
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://user:password@ep-host.neon.tech/dentalo?sslmode=require"
SESSION_SECRET="generate-a-64-character-hex-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_TIMEZONE="Africa/Mogadishu"
RESEND_API_KEY="re_xxxxxxxxxxxxxx" # optional
EMAIL_FROM="Dentalo <noreply@yourdomain.com>"
```

### Step 3: Run Database Migrations & Extensions
```bash
# Generate Prisma Client
npm run db:generate

# Push schema and apply btree_gist exclusion migration
npx prisma db push
```

To apply the `btree_gist` migration manually on PostgreSQL:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  DROP CONSTRAINT IF EXISTS "appointments_no_overlap";

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "dentistId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));
```

### Step 4: Seed Database with Somali Clinics & Sample Data
```bash
npm run db:seed
```
This populates:
- **Super Admin**: `admin@dentalo.app` (Password: `Admin1234!`)
- **Clinic 1**: Mogadishu Dental Specialist Clinic
  - Owner: `dr.ahmed@mogadishudental.so` (Password: `ClinicOwner123!`)
  - Dentist: `dr.fadumo@mogadishudental.so` (Password: `Dentist123!`)
- **Clinic 2**: Hargeisa Smile Care Center
  - Owner: `dr.guled@hargeisasmile.so` (Password: `ClinicOwner123!`)

### Step 5: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the platform.

---

## 5. Testing & Verification

Run the automated integration test suite:
```bash
npm test
```
The test suite validates:
1. `tenant-isolation.test.ts`: Verifies Prisma client extension strictly scopes queries to the correct tenant and prevents cross-tenant data leaks.
2. `optimistic-locking.test.ts`: Verifies version increments and conflict detection on concurrent appointment/visit modifications.
3. `double-booking.test.ts`: Validates slot overlapping logic, multi-dentist concurrency, and slot release upon cancellation.
4. `clinical-privacy-boundary.test.ts`: Verifies Super Admin zero-access policy and break-glass support session evaluation.

To run the TypeScript type checker:
```bash
npm run type-check
```
