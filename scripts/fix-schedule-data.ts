import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing schedule data and seeding October 2026 appointments...');

  // 1. Find Hargeisa Smile Care Center
  const hargeisa = await prisma.company.findFirst({
    where: { slug: 'hargeisa-smile' },
  });

  if (!hargeisa) {
    console.error('Hargeisa Smile Care Center not found');
    return;
  }

  // Find Dr. Guled Hassan membership
  const guledMembership = await prisma.companyMembership.findFirst({
    where: {
      companyId: hargeisa.id,
      user: { email: 'dr.guled@hargeisasmile.so' },
    },
  });

  if (!guledMembership) {
    console.error('Dr. Guled Hassan membership not found');
    return;
  }

  // 2. Ensure patients for Hargeisa
  let patientKhadra = await prisma.patient.findFirst({
    where: { companyId: hargeisa.id, phone: '+252 63 1112233' },
  });
  if (!patientKhadra) {
    patientKhadra = await prisma.patient.create({
      data: {
        companyId: hargeisa.id,
        fullName: 'Khadra Ismail Duale',
        phone: '+252 63 1112233',
        gender: 'FEMALE',
        medicalHistory: 'None',
        allergies: null,
        status: 'ACTIVE',
      },
    });
  }

  let patientMustafe = await prisma.patient.findFirst({
    where: { companyId: hargeisa.id, phone: '+252 63 4455667' },
  });
  if (!patientMustafe) {
    patientMustafe = await prisma.patient.create({
      data: {
        companyId: hargeisa.id,
        fullName: 'Mustafe Mohamed Egal',
        phone: '+252 63 4455667',
        gender: 'MALE',
        medicalHistory: 'Type 2 diabetes (diet-controlled)',
        allergies: 'Severe Penicillin allergy (anaphylaxis)',
        notes: 'Prefers morning appointments',
        status: 'ACTIVE',
      },
    });
  }

  let patientFowsiyo = await prisma.patient.findFirst({
    where: { companyId: hargeisa.id, phone: '+252 63 7788990' },
  });
  if (!patientFowsiyo) {
    patientFowsiyo = await prisma.patient.create({
      data: {
        companyId: hargeisa.id,
        fullName: 'Fowsiyo Axmed Yuusuf',
        phone: '+252 63 7788990',
        gender: 'FEMALE',
        medicalHistory: 'No chronic conditions',
        allergies: 'Latex hypersensitivity',
        notes: 'Needs orthodontic evaluation',
        status: 'ACTIVE',
      },
    });
  }

  // Delete existing appointments for Hargeisa to avoid duplicates/overlap
  await prisma.appointment.deleteMany({
    where: { companyId: hargeisa.id },
  });

  // Create appointments across October 2026 for Hargeisa:
  // Today: Oct 22, 2026
  // Africa/Mogadishu is UTC+3.
  // 09:00 AM Mogadishu = 06:00 AM UTC
  // 10:30 AM Mogadishu = 07:30 AM UTC
  // 02:00 PM Mogadishu = 11:00 AM UTC

  const appointmentsData = [
    // October 12, 2026 (Completed)
    {
      patientId: patientMustafe.id,
      date: new Date('2026-10-12T00:00:00.000Z'),
      startTime: new Date('2026-10-12T06:30:00.000Z'), // 09:30 AM local
      endTime: new Date('2026-10-12T07:15:00.000Z'),   // 10:15 AM local
      status: 'COMPLETED' as const,
      type: 'CHECKUP' as const,
      notes: 'Initial clinical examination and full mouth charting',
    },
    // October 18, 2026 (Completed)
    {
      patientId: patientKhadra.id,
      date: new Date('2026-10-18T00:00:00.000Z'),
      startTime: new Date('2026-10-18T07:00:00.000Z'), // 10:00 AM local
      endTime: new Date('2026-10-18T07:45:00.000Z'),   // 10:45 AM local
      status: 'COMPLETED' as const,
      type: 'TREATMENT' as const,
      notes: 'Upper premolar composite restoration',
    },
    // October 22, 2026 - Today slot 1
    {
      patientId: patientKhadra.id,
      date: new Date('2026-10-22T00:00:00.000Z'),
      startTime: new Date('2026-10-22T06:00:00.000Z'), // 09:00 AM local
      endTime: new Date('2026-10-22T06:30:00.000Z'),   // 09:30 AM local
      status: 'ARRIVED' as const,
      type: 'CHECKUP' as const,
      notes: 'Routine checkup and lower molar sensitivity examination',
    },
    // October 22, 2026 - Today slot 2
    {
      patientId: patientMustafe.id,
      date: new Date('2026-10-22T00:00:00.000Z'),
      startTime: new Date('2026-10-22T07:00:00.000Z'), // 10:00 AM local
      endTime: new Date('2026-10-22T07:45:00.000Z'),   // 10:45 AM local
      status: 'SCHEDULED' as const,
      type: 'TREATMENT' as const,
      notes: 'Quadrant 3 deep scaling and polishing',
    },
    // October 22, 2026 - Today slot 3
    {
      patientId: patientFowsiyo.id,
      date: new Date('2026-10-22T00:00:00.000Z'),
      startTime: new Date('2026-10-22T11:00:00.000Z'), // 02:00 PM local
      endTime: new Date('2026-10-22T11:45:00.000Z'),   // 02:45 PM local
      status: 'CONFIRMED' as const,
      type: 'CONSULTATION' as const,
      notes: 'Orthodontic alignment evaluation',
    },
    // October 25, 2026 (Upcoming)
    {
      patientId: patientMustafe.id,
      date: new Date('2026-10-25T00:00:00.000Z'),
      startTime: new Date('2026-10-25T06:30:00.000Z'), // 09:30 AM local
      endTime: new Date('2026-10-25T07:15:00.000Z'),   // 10:15 AM local
      status: 'SCHEDULED' as const,
      type: 'FOLLOW_UP' as const,
      notes: 'Post-scaling healing checkup',
    },
    // October 29, 2026 (Upcoming)
    {
      patientId: patientFowsiyo.id,
      date: new Date('2026-10-29T00:00:00.000Z'),
      startTime: new Date('2026-10-29T08:00:00.000Z'), // 11:00 AM local
      endTime: new Date('2026-10-29T08:45:00.000Z'),   // 11:45 AM local
      status: 'SCHEDULED' as const,
      type: 'TREATMENT' as const,
      notes: 'Bracket placement setup',
    },
  ];

  for (const item of appointmentsData) {
    await prisma.appointment.create({
      data: {
        companyId: hargeisa.id,
        patientId: item.patientId,
        dentistId: guledMembership.id,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        type: item.type,
        notes: item.notes,
        version: 1,
      },
    });
  }

  console.log(`Successfully created ${appointmentsData.length} appointments for Hargeisa Smile Care Center in October 2026.`);

  // Also fix Mogadishu Dental dates to match October 22, 2026
  const mogadishu = await prisma.company.findFirst({
    where: { slug: 'mogadishu-dental' },
  });

  if (mogadishu) {
    await prisma.appointment.updateMany({
      where: { companyId: mogadishu.id },
      data: {
        date: new Date('2026-10-22T00:00:00.000Z'),
      },
    });
    console.log('Updated Mogadishu Dental appointment dates to 2026-10-22.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
