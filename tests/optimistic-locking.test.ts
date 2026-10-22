import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Optimistic Concurrency Control (OCC)', () => {
  interface VersionedRecord {
    id: string;
    version: number;
    notes: string;
  }

  function applyVersionedUpdate(
    current: VersionedRecord,
    expectedVersion: number,
    newNotes: string
  ): { success: boolean; data?: VersionedRecord; error?: string } {
    if (current.version !== expectedVersion) {
      return {
        success: false,
        error: 'Conflict: This record was modified by another user.',
      };
    }

    return {
      success: true,
      data: {
        ...current,
        notes: newNotes,
        version: current.version + 1,
      },
    };
  }

  it('accepts updates when client version matches current version', () => {
    const record: VersionedRecord = {
      id: 'appt_1',
      version: 1,
      notes: 'Routine checkup',
    };

    const result = applyVersionedUpdate(record, 1, 'Routine checkup completed');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data?.version, 2);
    assert.strictEqual(result.data?.notes, 'Routine checkup completed');
  });

  it('rejects concurrent edits when client version is stale', () => {
    const record: VersionedRecord = {
      id: 'appt_1',
      version: 2, // Already incremented by another doctor
      notes: 'Updated by Doctor 1',
    };

    // Doctor 2 attempts update with old version 1
    const result = applyVersionedUpdate(record, 1, 'Simultaneous edit by Doctor 2');
    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Conflict/);
    assert.strictEqual(record.version, 2);
  });
});
