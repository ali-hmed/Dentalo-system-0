import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyExclusionConstraint() {
  console.log('Enabling btree_gist extension and adding PostgreSQL exclusion constraint...');
  
  try {
    // 1. Enable extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
    console.log('✓ btree_gist extension enabled');

    // 2. Drop existing constraint if present
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_no_overlap";
    `);

    // 3. Add exclusion constraint
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "appointments"
        ADD CONSTRAINT "appointments_no_overlap"
        EXCLUDE USING gist (
          "dentistId" WITH =,
          tstzrange("startTime", "endTime", '[)') WITH &&
        )
        WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));
    `);
    console.log('✓ appointments_no_overlap exclusion constraint added successfully');

    // 4. Index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "appointments_dentist_time_gist"
        ON "appointments"
        USING gist ("dentistId", tstzrange("startTime", "endTime", '[)'));
    `);
    console.log('✓ GiST index created successfully');

  } catch (error) {
    console.error('Error applying exclusion constraint:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyExclusionConstraint();
