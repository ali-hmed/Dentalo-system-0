import React from 'react';
import Link from 'next/link';
import { getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const selectedDate = searchParams.date || todayStr;

  const startOfDay = new Date(`${selectedDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${selectedDate}T23:59:59.999Z`);

  // Compute Prev and Next dates
  const curDateObj = new Date(selectedDate);
  const prevDate = new Date(curDateObj.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const nextDate = new Date(curDateObj.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [appointments, patients, dentists] = await Promise.all([
    tenantDb.appointment.findMany({
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
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
    dentistName: a.dentist.user.name,
    patientId: a.patientId,
    patientName: a.patient.fullName,
    patientPhone: a.patient.phone,
    patientAllergies: a.patient.allergies,
    patientMedicalHistory: a.patient.medicalHistory,
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
        {/* Date Navigator Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface border border-border rounded p-3">
          <div className="flex items-center gap-2">
            <Link href={`/app/schedule?date=${prevDate}`}>
              <Button variant="secondary" size="sm" aria-label="Previous day">
                <ChevronLeftIcon size={16} />
              </Button>
            </Link>

            <Link href={`/app/schedule?date=${todayStr}`}>
              <Button
                variant={selectedDate === todayStr ? 'primary' : 'secondary'}
                size="sm"
              >
                Today
              </Button>
            </Link>

            <Link href={`/app/schedule?date=${nextDate}`}>
              <Button variant="secondary" size="sm" aria-label="Next day">
                <ChevronRightIcon size={16} />
              </Button>
            </Link>

            <span className="text-body font-medium text-foreground ml-2">
              {formatDate(selectedDate)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-label text-muted">
            <span className="font-mono">Timezone: Africa/Mogadishu (UTC+3)</span>
            <span>&bull;</span>
            <span>{appointments.length} appointments</span>
          </div>
        </div>

        {/* Schedule Grid with Interactive Side Panel */}
        <ScheduleView
          companyId={companyId}
          selectedDate={selectedDate}
          appointments={appointmentItems}
          dentists={dentistList}
        />
      </div>
    </div>
  );
}
