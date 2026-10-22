import React from 'react';
import Link from 'next/link';
import { prisma, getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { StatisticsBar } from '@/components/ui/statistics-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTime, formatDate } from '@/lib/utils';
import { PlusIcon, CalendarIcon, PatientIcon, AlertIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function CompanyDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const companyContext = await getCompanyForUser(session.user.id);
  if (!companyContext) return null;

  const companyId = companyContext.companyId;
  const tenantDb = getTenantClient(companyId);

  // Time boundaries in UTC
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Query database in parallel scoped to tenant
  const [
    todayAppointments,
    todayCompletedCount,
    newPatientsThisMonth,
    allAppointmentsMonth,
    noShowAppointmentsMonth,
    waitingPatients,
    upcomingToday,
    past14DaysAppointments,
    commonTreatments,
  ] = await Promise.all([
    tenantDb.appointment.count({
      where: {
        startTime: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    tenantDb.appointment.count({
      where: {
        startTime: { gte: startOfToday, lte: endOfToday },
        status: 'COMPLETED',
      },
    }),
    tenantDb.patient.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    }),
    tenantDb.appointment.count({
      where: {
        startTime: { gte: startOfMonth },
      },
    }),
    tenantDb.appointment.count({
      where: {
        startTime: { gte: startOfMonth },
        status: 'NO_SHOW',
      },
    }),
    // Waiting patients: status == ARRIVED
    tenantDb.appointment.findMany({
      where: {
        startTime: { gte: startOfToday, lte: endOfToday },
        status: 'ARRIVED',
      },
      include: {
        patient: { select: { id: true, fullName: true, phone: true, allergies: true } },
        dentist: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startTime: 'asc' },
    }),
    // Today's upcoming appointments
    tenantDb.appointment.findMany({
      where: {
        startTime: { gte: startOfToday, lte: endOfToday },
      },
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        dentist: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    }),
    // 14 days appointment trend
    tenantDb.appointment.findMany({
      where: {
        startTime: { gte: fourteenDaysAgo },
        status: { notIn: ['CANCELLED'] },
      },
      select: { startTime: true },
      orderBy: { startTime: 'asc' },
    }),
    // Treatments breakdown
    tenantDb.treatmentRecord.groupBy({
      by: ['procedureName'],
      _count: { procedureName: true },
      where: { companyId },
      orderBy: {
        _count: { procedureName: 'desc' },
      },
      take: 5,
    }),
  ]);

  // Compute No-Show Rate
  const noShowRate =
    allAppointmentsMonth > 0
      ? `${((noShowAppointmentsMonth / allAppointmentsMonth) * 100).toFixed(1)}%`
      : '0.0%';

  // Joined statistics bar items
  const stats = [
    {
      label: "Today's Appointments",
      value: `${todayAppointments} (${todayCompletedCount} completed)`,
    },
    {
      label: 'New Patients This Month',
      value: newPatientsThisMonth,
    },
    {
      label: 'No-Show Rate (Month)',
      value: noShowRate,
    },
    {
      label: 'Revenue (Placeholder)',
      value: '—', // Inactive placeholder as specified in prompt
    },
  ];

  // Daily counts for past 14 days
  const dailyCounts: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
    dailyCounts[dayStr] = 0;
  }
  for (const appt of past14DaysAppointments) {
    const d = new Date(appt.startTime);
    const dayStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
    if (dayStr in dailyCounts) {
      dailyCounts[dayStr] += 1;
    }
  }

  const maxDailyCount = Math.max(1, ...Object.values(dailyCounts));

  return (
    <div>
      <Topbar
        title="Clinic Dashboard"
        userName={session.user.name}
        userEmail={session.user.email}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/patients">
              <Button variant="secondary" size="sm">
                <PatientIcon size={16} />
                <span>New Patient</span>
              </Button>
            </Link>
            <Link href="/app/schedule">
              <Button variant="primary" size="sm">
                <CalendarIcon size={16} />
                <span>Schedule</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
        {/* Section 1: Joined statistics bar */}
        <div>
          <h2 className="text-label text-muted uppercase tracking-wider mb-2 font-medium">
            Daily Operations
          </h2>
          <StatisticsBar items={stats} />
        </div>

        {/* Section 2: 14-Day Appointments Trend & Treatments Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-body font-medium text-foreground">
                  Appointments Per Day
                </h3>
                <p className="text-label text-muted">Past 14 days activity</p>
              </div>
            </div>

            <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-border">
              {Object.entries(dailyCounts).map(([day, count]) => {
                const heightPercent = Math.round((count / maxDailyCount) * 100);
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] text-muted font-medium">{count}</span>
                    <div
                      className="w-full bg-accent/25 hover:bg-accent/40 rounded-t transition-colors"
                      style={{ height: `${Math.max(6, heightPercent)}%` }}
                    />
                    <span className="text-[10px] text-muted truncate w-full text-center">
                      {day.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Treatments Breakdown */}
          <div className="bg-surface border border-border rounded p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-body font-medium text-foreground mb-1">
                Common Procedures
              </h3>
              <p className="text-label text-muted mb-4">Most frequent treatments</p>

              {commonTreatments.length === 0 ? (
                <p className="text-body text-muted py-6 text-center">
                  No treatments recorded yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {commonTreatments.map((t) => (
                    <div
                      key={t.procedureName}
                      className="flex items-center justify-between p-2 rounded bg-surface-secondary"
                    >
                      <span className="text-body font-medium text-foreground truncate max-w-[160px]">
                        {t.procedureName}
                      </span>
                      <span className="text-label font-medium text-accent px-2 py-0.5 rounded bg-accent/10">
                        {t._count.procedureName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border mt-3">
              <Link
                href="/app/treatments"
                className="text-label text-accent hover:underline font-medium"
              >
                View all treatments &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Section 3: Waiting Queue & Today's Schedule Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waiting Patients */}
          <div className="bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-info animate-pulse" />
                <h3 className="text-body font-medium text-foreground">
                  Waiting Patients ({waitingPatients.length})
                </h3>
              </div>
            </div>
            <p className="text-label text-muted mb-3">
              Checked-in and ready for examination
            </p>

            {waitingPatients.length === 0 ? (
              <p className="text-body text-muted py-6 text-center">
                No patients currently in the waiting area.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {waitingPatients.map((appt) => (
                  <div key={appt.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/app/patients/${appt.patient.id}`}
                        className="text-body font-medium text-foreground hover:text-accent"
                      >
                        {appt.patient.fullName}
                      </Link>
                      <span className="text-label text-muted font-mono">
                        {formatTime(appt.startTime)}
                      </span>
                    </div>
                    <p className="text-label text-muted">
                      Dentist: {appt.dentist.user.name}
                    </p>
                    {appt.patient.allergies && (
                      <div className="flex items-center gap-1 text-[11px] text-status-error font-medium">
                        <AlertIcon size={12} />
                        <span>Allergy: {appt.patient.allergies}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Upcoming Appointments */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-body font-medium text-foreground">
                  Today's Schedule
                </h3>
                <p className="text-label text-muted">Upcoming visits for today</p>
              </div>
              <Link
                href="/app/schedule"
                className="text-label text-accent hover:underline font-medium"
              >
                Full day schedule &rarr;
              </Link>
            </div>

            {upcomingToday.length === 0 ? (
              <p className="text-body text-muted py-8 text-center">
                No appointments booked for today.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body">
                  <thead>
                    <tr className="border-b border-border text-label text-muted uppercase">
                      <th className="py-2 px-3 font-medium">Time</th>
                      <th className="py-2 px-3 font-medium">Patient</th>
                      <th className="py-2 px-3 font-medium">Dentist</th>
                      <th className="py-2 px-3 font-medium">Type</th>
                      <th className="py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {upcomingToday.map((appt) => (
                      <tr key={appt.id} className="hover:bg-surface-secondary/40">
                        <td className="py-2.5 px-3 text-label text-muted whitespace-nowrap font-mono">
                          {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/app/patients/${appt.patient.id}`}
                            className="font-medium text-foreground hover:text-accent"
                          >
                            {appt.patient.fullName}
                          </Link>
                          <span className="block text-label text-muted">
                            {appt.patient.phone}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted">
                          {appt.dentist.user.name}
                        </td>
                        <td className="py-2.5 px-3 text-label text-muted">
                          {appt.type}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              appt.status === 'COMPLETED'
                                ? 'success'
                                : appt.status === 'IN_PROGRESS'
                                ? 'accent'
                                : appt.status === 'ARRIVED'
                                ? 'info'
                                : appt.status === 'CANCELLED'
                                ? 'error'
                                : appt.status === 'NO_SHOW'
                                ? 'neutral'
                                : 'warning'
                            }
                          >
                            {appt.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
