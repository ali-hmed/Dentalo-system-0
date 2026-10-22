import React from 'react';
import { getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { getDateStringInTz } from '@/lib/utils';
import { BookAppointmentModal } from './book-appointment-modal';
import { ScheduleView } from './schedule-view';

export const dynamic = 'force-dynamic';

interface SchedulePageProps {
  searchParams: { date?: string };
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const session = await getSession();
  if (!session) return null;

  const companyContext = await getCompanyForUser(session.user.id);
  if (!companyContext) return null;

  const companyId = companyContext.companyId;
  const tenantDb = getTenantClient(companyId);

  // Selected date defaults to today in Africa/Mogadishu
  const todayStr = getDateStringInTz(new Date());
  const selectedDate = searchParams.date || todayStr;

  // Extract year and month to load appointments for the month range
  const [yearStr, monthStr] = selectedDate.split('-');
  const year = parseInt(yearStr, 10) || 2026;
  const month = parseInt(monthStr, 10) || 10;

  // Cover range from previous month to next month to fill calendar grid
  const startOfRange = new Date(Date.UTC(year, month - 2, 20, 0, 0, 0));
  const endOfRange = new Date(Date.UTC(year, month + 1, 15, 23, 59, 59, 999));

  const [appointments, patients, dentists] = await Promise.all([
    tenantDb.appointment.findMany({
      where: {
        startTime: {
          gte: startOfRange,
          lte: endOfRange,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            allergies: true,
            medicalHistory: true,
          },
        },
        dentist: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    }),
    tenantDb.patient.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: 'asc' },
      take: 200,
    }),
    tenantDb.companyMembership.findMany({
      where: {
        companyId,
        staffType: { in: ['DENTIST', 'OWNER'] },
        status: 'ACTIVE',
      },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const dentistList = dentists.map((d) => ({
    id: d.id,
    name: `${d.user.name} (${d.staffType})`,
  }));

  const patientList = patients.map((p) => ({
    id: p.id,
    name: p.fullName,
    phone: p.phone,
  }));

  const appointmentItems = appointments.map((a) => ({
    id: a.id,
    dentistId: a.dentistId,
    dentistName: a.dentist?.user?.name || 'Assigned Clinician',
    patientId: a.patientId,
    patientName: a.patient.fullName,
    patientPhone: a.patient.phone,
    patientAllergies: a.patient.allergies,
    patientMedicalHistory: a.patient.medicalHistory,
    dateString: getDateStringInTz(a.startTime),
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    status: a.status as any,
    type: a.type,
    notes: a.notes,
    version: a.version,
  }));

  return (
    <div>
      <Topbar
        title="Clinic Schedule"
        userName={session.user.name}
        userEmail={session.user.email}
        actions={
          <BookAppointmentModal
            companyId={companyId}
            selectedDate={selectedDate}
            patients={patientList}
            dentists={dentistList}
          />
        }
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
        <ScheduleView
          companyId={companyId}
          selectedDate={selectedDate}
          todayStr={todayStr}
          appointments={appointmentItems}
          dentists={dentistList}
        />
      </div>
    </div>
  );
}
