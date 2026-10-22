import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Double-Booking Prevention Logic & Time Ranges', () => {
  interface AppointmentRange {
    dentistId: string;
    startTime: Date;
    endTime: Date;
    status: string;
  }

  function hasOverlap(
    newAppt: { dentistId: string; startTime: Date; endTime: Date },
    existingList: AppointmentRange[]
  ): boolean {
    return existingList.some((existing) => {
      // Ignore cancelled or no-show slots (consistent with Postgres exclusion constraint predicate)
      if (existing.status === 'CANCELLED' || existing.status === 'NO_SHOW') {
        return false;
      }
      if (existing.dentistId !== newAppt.dentistId) {
        return false;
      }

      // Check tstzrange overlapping: [startA, endA) && [startB, endB)
      return existing.startTime < newAppt.endTime && existing.endTime > newAppt.startTime;
    });
  }

  const dentistId = 'dentist_fadumo_1';

  const existingBookings: AppointmentRange[] = [
    {
      dentistId,
      startTime: new Date('2026-10-23T09:00:00.000Z'),
      endTime: new Date('2026-10-23T09:30:00.000Z'),
      status: 'CONFIRMED',
    },
    {
      dentistId,
      startTime: new Date('2026-10-23T10:00:00.000Z'),
      endTime: new Date('2026-10-23T11:00:00.000Z'),
      status: 'CANCELLED', // Cancelled booking
    },
  ];

  it('rejects booking that exactly overlaps an active appointment', () => {
    const overlapping = {
      dentistId,
      startTime: new Date('2026-10-23T09:00:00.000Z'),
      endTime: new Date('2026-10-23T09:30:00.000Z'),
    };
    assert.strictEqual(hasOverlap(overlapping, existingBookings), true);
  });

  it('rejects booking that partially overlaps inside an active appointment', () => {
    const partialOverlap = {
      dentistId,
      startTime: new Date('2026-10-23T09:15:00.000Z'),
      endTime: new Date('2026-10-23T09:45:00.000Z'),
    };
    assert.strictEqual(hasOverlap(partialOverlap, existingBookings), true);
  });

  it('permits booking on adjacent non-overlapping slots', () => {
    const adjacentSlot = {
      dentistId,
      startTime: new Date('2026-10-23T09:30:00.000Z'),
      endTime: new Date('2026-10-23T10:00:00.000Z'),
    };
    assert.strictEqual(hasOverlap(adjacentSlot, existingBookings), false);
  });

  it('permits rebooking a time slot previously held by a CANCELLED appointment', () => {
    const cancelledSlot = {
      dentistId,
      startTime: new Date('2026-10-23T10:00:00.000Z'),
      endTime: new Date('2026-10-23T10:30:00.000Z'),
    };
    assert.strictEqual(hasOverlap(cancelledSlot, existingBookings), false);
  });

  it('permits simultaneous booking for a different dentist at the same time', () => {
    const differentDentistSlot = {
      dentistId: 'dentist_ahmed_2',
      startTime: new Date('2026-10-23T09:00:00.000Z'),
      endTime: new Date('2026-10-23T09:30:00.000Z'),
    };
    assert.strictEqual(hasOverlap(differentDentistSlot, existingBookings), false);
  });
});
