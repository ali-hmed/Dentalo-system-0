import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('Seeding Dentalo database...');

  // 1. Password hashes
  const adminPasswordHash = await bcrypt.hash('Admin1234!', SALT_ROUNDS);
  const ownerPasswordHash = await bcrypt.hash('ClinicOwner123!', SALT_ROUNDS);
  const dentistPasswordHash = await bcrypt.hash('Dentist123!', SALT_ROUNDS);

  // 2. Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@dentalo.app' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@dentalo.app',
      name: 'Platform Super Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`Created Super Admin: ${superAdmin.email}`);

  // 3. Clinic 1: Mogadishu Dental Specialist
  const company1 = await prisma.company.upsert({
    where: { slug: 'mogadishu-dental' },
    update: {},
    create: {
      name: 'Mogadishu Dental Specialist Clinic',
      slug: 'mogadishu-dental',
      email: 'contact@mogadishudental.so',
      phone: '+252 61 5551234',
      address: 'Maka Al Mukarama Road, Hodan District',
      city: 'Mogadishu',
      status: 'ACTIVE',
    },
  });

  // Owner 1
  const owner1 = await prisma.user.upsert({
    where: { email: 'dr.ahmed@mogadishudental.so' },
    update: { passwordHash: ownerPasswordHash },
    create: {
      email: 'dr.ahmed@mogadishudental.so',
      name: 'Dr. Ahmed Warsame',
      passwordHash: ownerPasswordHash,
      role: 'COMPANY_OWNER',
      status: 'ACTIVE',
    },
  });

  const membership1 = await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: owner1.id,
        companyId: company1.id,
      },
    },
    update: {},
    create: {
      userId: owner1.id,
      companyId: company1.id,
      staffType: 'OWNER',
      status: 'ACTIVE',
    },
  });

  // Dentist 1
  const dentist1User = await prisma.user.upsert({
    where: { email: 'dr.fadumo@mogadishudental.so' },
    update: { passwordHash: dentistPasswordHash },
    create: {
      email: 'dr.fadumo@mogadishudental.so',
      name: 'Dr. Fadumo Nur',
      passwordHash: dentistPasswordHash,
      role: 'COMPANY_STAFF',
      status: 'ACTIVE',
    },
  });

  const dentist1Membership = await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: dentist1User.id,
        companyId: company1.id,
      },
    },
    update: {},
    create: {
      userId: dentist1User.id,
      companyId: company1.id,
      staffType: 'DENTIST',
      status: 'ACTIVE',
    },
  });

  await prisma.staffProfile.upsert({
    where: { membershipId: dentist1Membership.id },
    update: {},
    create: {
      membershipId: dentist1Membership.id,
      specialization: 'Endodontics & Restorative',
      licenseNumber: 'SOM-MOH-2024-089',
    },
  });

  // Clinic 2: Hargeisa Smile Care
  const company2 = await prisma.company.upsert({
    where: { slug: 'hargeisa-smile' },
    update: {},
    create: {
      name: 'Hargeisa Smile Care Center',
      slug: 'hargeisa-smile',
      email: 'info@hargeisasmile.so',
      phone: '+252 63 4445678',
      address: 'Independence Way, Downtown',
      city: 'Hargeisa',
      status: 'ACTIVE',
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'dr.guled@hargeisasmile.so' },
    update: { passwordHash: ownerPasswordHash },
    create: {
      email: 'dr.guled@hargeisasmile.so',
      name: 'Dr. Guled Hassan',
      passwordHash: ownerPasswordHash,
      role: 'COMPANY_OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: owner2.id,
        companyId: company2.id,
      },
    },
    update: {},
    create: {
      userId: owner2.id,
      companyId: company2.id,
      staffType: 'OWNER',
      status: 'ACTIVE',
    },
  });

  // 4. Sample Patients for Clinic 1
  const patient1 = await prisma.patient.create({
    data: {
      companyId: company1.id,
      fullName: 'Sahra Jama Gedi',
      phone: '+252 61 7112233',
      email: 'sahra.jama@example.so',
      gender: 'FEMALE',
      dateOfBirth: new Date('1992-05-14'),
      allergies: 'Severe Penicillin allergy (anaphylaxis)',
      medicalHistory: 'Mild asthma, uses albuterol inhaler',
      notes: 'Prefers morning appointments',
      status: 'ACTIVE',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      companyId: company1.id,
      fullName: 'Abdirahman Farah Ali',
      phone: '+252 61 8223344',
      gender: 'MALE',
      dateOfBirth: new Date('1985-11-20'),
      allergies: null,
      medicalHistory: 'Hypertension managed with medication',
      status: 'ACTIVE',
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      companyId: company1.id,
      fullName: 'Maryan Muse Osman',
      phone: '+252 61 9334455',
      gender: 'FEMALE',
      dateOfBirth: new Date('2001-08-03'),
      allergies: 'Latex hypersensitivity',
      status: 'ACTIVE',
    },
  });

  // Sample Patients for Clinic 2
  const patient4 = await prisma.patient.create({
    data: {
      companyId: company2.id,
      fullName: 'Khadra Ismail Duale',
      phone: '+252 63 1112233',
      gender: 'FEMALE',
      medicalHistory: 'None',
      allergies: null,
      status: 'ACTIVE',
    },
  });

  const patient5 = await prisma.patient.create({
    data: {
      companyId: company2.id,
      fullName: 'Mustafe Mohamed Egal',
      phone: '+252 63 4455667',
      gender: 'MALE',
      medicalHistory: 'Type 2 diabetes (diet-controlled)',
      allergies: 'Severe Penicillin allergy (anaphylaxis)',
      notes: 'Prefers morning appointments',
      status: 'ACTIVE',
    },
  });

  // 5. Today's Appointments for Clinic 1 and Clinic 2 in Africa/Mogadishu time
  const today = new Date();
  const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const appt1Start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
  const appt1End = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30, 0);

  const appt2Start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);
  const appt2End = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 45, 0);

  const appt1 = await prisma.appointment.create({
    data: {
      companyId: company1.id,
      patientId: patient1.id,
      dentistId: dentist1Membership.id,
      date: dateOnly,
      startTime: appt1Start,
      endTime: appt1End,
      status: 'ARRIVED',
      type: 'CHECKUP',
      notes: 'Routine checkup and lower molar sensitivity examination',
      version: 1,
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      companyId: company1.id,
      patientId: patient2.id,
      dentistId: dentist1Membership.id,
      date: dateOnly,
      startTime: appt2Start,
      endTime: appt2End,
      status: 'SCHEDULED',
      type: 'TREATMENT',
      notes: 'Scheduled for quadrant 4 restoration',
      version: 1,
    },
  });

  // Clinic 2 appointments for Dr. Guled Hassan
  const hargeisaMembership = await prisma.companyMembership.findFirst({
    where: { companyId: company2.id, staffType: 'OWNER' },
  });

  if (hargeisaMembership) {
    const hAppt1Start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
    const hAppt1End = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 45, 0);
    const hAppt2Start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30, 0);
    const hAppt2End = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 15, 0);

    await prisma.appointment.create({
      data: {
        companyId: company2.id,
        patientId: patient4.id,
        dentistId: hargeisaMembership.id,
        date: dateOnly,
        startTime: hAppt1Start,
        endTime: hAppt1End,
        status: 'ARRIVED',
        type: 'CHECKUP',
        notes: 'Routine dental hygiene examination and scaling',
        version: 1,
      },
    });

    await prisma.appointment.create({
      data: {
        companyId: company2.id,
        patientId: patient5.id,
        dentistId: hargeisaMembership.id,
        date: dateOnly,
        startTime: hAppt2Start,
        endTime: hAppt2End,
        status: 'SCHEDULED',
        type: 'TREATMENT',
        notes: 'Cavity preparation and resin restoration',
        version: 1,
      },
    });
  }

  // 6. Clinical Visit & Treatment Records
  const pastVisitDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const visit1 = await prisma.visit.create({
    data: {
      companyId: company1.id,
      patientId: patient1.id,
      dentistId: dentist1Membership.id,
      date: pastVisitDate,
      chiefComplaint: 'Pain on biting on upper right premolar',
      examination: 'MOD caries detected on tooth #15, cold test positive with lingering sensitivity',
      diagnosis: 'Reversible pulpitis #15',
      notes: 'Caries excavated completely under local anesthesia (Lidocaine 2% without epinephrine)',
      followUpInstructions: 'Monitor cold sensitivity over next 14 days, return if pain becomes spontaneous',
      status: 'COMPLETED',
      version: 1,
      treatmentRecords: {
        create: [
          {
            companyId: company1.id,
            procedureName: 'Composite Resin Restoration (MOD)',
            toothNumber: '15',
            description: '3-surface light-cured composite resin restoration, shade A3',
            status: 'COMPLETED',
          },
          {
            companyId: company1.id,
            procedureName: 'Full Mouth Scaling & Polishing',
            description: 'Ultrasonic supra-gingival calculus removal',
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  // 7. Audit log entries
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      companyId: company1.id,
      action: 'COMPANY_CREATED',
      entityType: 'Company',
      entityId: company1.id,
      details: { name: company1.name },
      severity: 'INFO',
    },
  });

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
