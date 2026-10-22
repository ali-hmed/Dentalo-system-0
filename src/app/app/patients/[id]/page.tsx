import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime, formatTime } from '@/lib/utils';
import { AlertIcon, ToothIcon, CalendarIcon } from '@/components/icons';
import { NewVisitModal } from './new-visit-modal';
import { EditPatientModal } from './edit-patient-modal';

export const dynamic = 'force-dynamic';

interface PatientRecordPageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function PatientRecordPage({ params, searchParams }: PatientRecordPageProps) {
  const session = await getSession();
  if (!session) return null;

  const companyContext = await getCompanyForUser(session.user.id);
  if (!companyContext) return null;

  const companyId = companyContext.companyId;
  const tenantDb = getTenantClient(companyId);

  const [patient, activeDentists] = await Promise.all([
    tenantDb.patient.findUnique({
      where: { id: params.id },
      include: {
        visits: {
          orderBy: { date: 'desc' },
          include: {
            dentist: { include: { user: { select: { name: true } } } },
            treatmentRecords: true,
          },
        },
        appointments: {
          orderBy: { startTime: 'desc' },
          include: {
            dentist: { include: { user: { select: { name: true } } } },
          },
        },
      },
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
    }),
  ]);

  if (!patient) {
    notFound();
  }

  const dentistOptions = activeDentists.map((d) => ({
    id: d.id,
    name: `${d.user.name} (${d.staffType})`,
  }));

  const activeTab = searchParams.tab || 'history';

  return (
    <div>
      <Topbar
        title={patient.fullName}
        userName={session.user.name}
        userEmail={session.user.email}
        actions={
          <div className="flex items-center gap-2">
            <EditPatientModal companyId={companyId} patient={patient} />
            <NewVisitModal
              companyId={companyId}
              patientId={patient.id}
              dentists={dentistOptions}
            />
          </div>
        }
      >
        <Link
          href="/app/patients"
          className="text-label text-muted hover:text-foreground font-medium hidden sm:inline"
        >
          &larr; Patients
        </Link>
      </Topbar>

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
        {/* Prominent Allergy / Medical Alert Banner */}
        {patient.allergies && (
          <div
            role="alert"
            className="p-4 rounded bg-status-error-bg border border-status-error/30 text-status-error flex items-start gap-3"
          >
            <AlertIcon size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-body font-medium">
                Clinical Allergy Alert: {patient.allergies}
              </p>
              <p className="text-label text-status-error/80 mt-0.5">
                Check all prescribed medications, local anesthetics, and materials before initiating dental treatment.
              </p>
            </div>
          </div>
        )}

        {/* Patient Profile Card */}
        <div className="bg-surface border border-border rounded p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-body">
            <div>
              <span className="text-label text-muted block">Phone</span>
              <span className="font-medium font-mono text-foreground">{patient.phone}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Email</span>
              <span className="text-foreground">{patient.email || '—'}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Gender</span>
              <span className="text-foreground">{patient.gender || '—'}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Date of Birth</span>
              <span className="text-foreground">
                {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : '—'}
              </span>
            </div>
          </div>

          {patient.medicalHistory && (
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-label text-muted block">Medical History</span>
              <p className="text-body text-foreground mt-0.5">{patient.medicalHistory}</p>
            </div>
          )}

          {patient.notes && (
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-label text-muted block">General Notes</span>
              <p className="text-body text-foreground mt-0.5">{patient.notes}</p>
            </div>
          )}
        </div>

        {/* Tabs: Clinical History, Appointments, Notes */}
        <div>
          <div className="flex border-b border-border space-x-6">
            <Link
              href={`/app/patients/${patient.id}?tab=history`}
              className={`pb-2.5 text-body font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'history'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              Visits & Clinical History ({patient.visits.length})
            </Link>
            <Link
              href={`/app/patients/${patient.id}?tab=appointments`}
              className={`pb-2.5 text-body font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'appointments'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              Appointments ({patient.appointments.length})
            </Link>
          </div>

          <div className="mt-4">
            {/* Tab 1: Visits History */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {patient.visits.length === 0 ? (
                  <div className="bg-surface border border-border rounded p-12 text-center">
                    <ToothIcon className="mx-auto text-muted mb-2" size={24} />
                    <p className="text-body font-medium text-foreground mb-1">
                      No clinical visits recorded
                    </p>
                    <p className="text-label text-muted">
                      Click &ldquo;Record Visit&rdquo; to document an examination, diagnosis, and procedures.
                    </p>
                  </div>
                ) : (
                  patient.visits.map((visit) => (
                    <div
                      key={visit.id}
                      className="bg-surface border border-border rounded p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between border-b border-border pb-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-body font-medium text-foreground">
                              {formatDateTime(visit.date)}
                            </span>
                            <Badge variant="neutral">
                              Dentist: {visit.dentist.user.name}
                            </Badge>
                          </div>
                          {visit.chiefComplaint && (
                            <p className="text-label text-muted mt-1">
                              Chief Complaint: {visit.chiefComplaint}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={visit.status === 'COMPLETED' ? 'success' : 'warning'}
                        >
                          {visit.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body">
                        {visit.examination && (
                          <div>
                            <span className="text-label text-muted block">Examination</span>
                            <p className="text-foreground mt-0.5">{visit.examination}</p>
                          </div>
                        )}
                        {visit.diagnosis && (
                          <div>
                            <span className="text-label text-muted block">Diagnosis</span>
                            <p className="text-foreground mt-0.5">{visit.diagnosis}</p>
                          </div>
                        )}
                      </div>

                      {/* Procedures in this visit */}
                      {visit.treatmentRecords.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <span className="text-label font-medium text-muted uppercase tracking-wider block mb-2">
                            Performed Procedures
                          </span>
                          <div className="space-y-2">
                            {visit.treatmentRecords.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between p-2.5 rounded bg-surface-secondary text-body"
                              >
                                <div className="flex items-center gap-3">
                                  {t.toothNumber && (
                                    <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium text-label font-mono">
                                      Tooth #{t.toothNumber}
                                    </span>
                                  )}
                                  <span className="font-medium text-foreground">
                                    {t.procedureName}
                                  </span>
                                  {t.description && (
                                    <span className="text-muted text-label hidden sm:inline">
                                      &bull; {t.description}
                                    </span>
                                  )}
                                </div>
                                <Badge
                                  variant={
                                    t.status === 'COMPLETED'
                                      ? 'success'
                                      : t.status === 'IN_PROGRESS'
                                      ? 'accent'
                                      : 'neutral'
                                  }
                                >
                                  {t.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(visit.notes || visit.followUpInstructions) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border text-label">
                          {visit.notes && (
                            <div>
                              <span className="text-muted block">Progress Notes</span>
                              <p className="text-foreground mt-0.5">{visit.notes}</p>
                            </div>
                          )}
                          {visit.followUpInstructions && (
                            <div>
                              <span className="text-muted block">Follow-up Instructions</span>
                              <p className="text-foreground mt-0.5">
                                {visit.followUpInstructions}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Appointments */}
            {activeTab === 'appointments' && (
              <div className="bg-surface border border-border rounded overflow-hidden">
                {patient.appointments.length === 0 ? (
                  <div className="p-12 text-center">
                    <CalendarIcon className="mx-auto text-muted mb-2" size={24} />
                    <p className="text-body font-medium text-foreground mb-1">
                      No appointments booked
                    </p>
                    <p className="text-label text-muted">
                      Schedule an appointment from the clinic calendar.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead>
                        <tr className="bg-surface-secondary border-b border-border text-label text-muted uppercase">
                          <th className="py-2.5 px-4 font-medium">Date & Time</th>
                          <th className="py-2.5 px-4 font-medium">Dentist</th>
                          <th className="py-2.5 px-4 font-medium">Type</th>
                          <th className="py-2.5 px-4 font-medium">Status</th>
                          <th className="py-2.5 px-4 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {patient.appointments.map((a) => (
                          <tr key={a.id} className="hover:bg-surface-secondary/40">
                            <td className="py-3 px-4 font-mono text-label whitespace-nowrap">
                              {formatDateTime(a.startTime)} - {formatTime(a.endTime)}
                            </td>
                            <td className="py-3 px-4 text-foreground">
                              {a.dentist.user.name}
                            </td>
                            <td className="py-3 px-4 text-muted text-label">{a.type}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  a.status === 'COMPLETED'
                                    ? 'success'
                                    : a.status === 'IN_PROGRESS'
                                    ? 'accent'
                                    : a.status === 'ARRIVED'
                                    ? 'info'
                                    : a.status === 'CANCELLED'
                                    ? 'error'
                                    : 'warning'
                                }
                              >
                                {a.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-label text-muted">
                              {a.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
