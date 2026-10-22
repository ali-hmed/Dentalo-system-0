-- Enable btree_gist extension (required for exclusion constraints with non-GiST types)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping appointments for the same dentist.
-- Uses an exclusion constraint on the tstzrange("startTime", "endTime", '[)') column
-- scoped to the same dentist, only for active appointments (excluding CANCELLED and NO_SHOW).
ALTER TABLE "appointments"
  DROP CONSTRAINT IF EXISTS "appointments_no_overlap";

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "dentistId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));

-- Composite index to support the exclusion constraint queries
CREATE INDEX IF NOT EXISTS "appointments_dentist_time_gist"
  ON "appointments"
  USING gist ("dentistId", tstzrange("startTime", "endTime", '[)'));
