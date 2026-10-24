import { describe, expect, it } from 'vitest';
import { computePriority, PRIORITY_WEIGHT } from '@/lib/domain/priority';
import type { PriorityInputRecord } from '@/lib/domain/priority';

const rec = (
  isGroup: boolean,
  type: PriorityInputRecord['groupEntityType'],
  status: PriorityInputRecord['verificationStatus'],
): PriorityInputRecord => ({ isGroupEntity: isGroup, groupEntityType: type, verificationStatus: status });

describe('group employment priority (mission §4.3 — deterministic & explainable)', () => {
  it('VERIFIED_PARENT outranks everything', () => {
    const r = computePriority([
      rec(true, 'SUBSIDIARY', 'VERIFIED'),
      rec(true, 'PARENT', 'VERIFIED'),
      rec(true, 'PARENT', 'PENDING'),
    ]);
    expect(r.priority).toBe('VERIFIED_PARENT');
    expect(r.reason).toContain('ستاد سازمان مادر');
  });

  it('VERIFIED_SUBSIDIARY outranks pending', () => {
    const r = computePriority([
      rec(true, 'SUBSIDIARY', 'PENDING'),
      rec(true, 'SUBSIDIARY', 'VERIFIED'),
    ]);
    expect(r.priority).toBe('VERIFIED_SUBSIDIARY');
    expect(r.reason).toContain('زیرمجموعه');
  });

  it('pending group claim grants pending — never verified priority', () => {
    const r = computePriority([rec(true, 'PARENT', 'PENDING')]);
    expect(r.priority).toBe('PENDING_VERIFICATION');
  });

  it('rejected claims do not grant verified priority', () => {
    const r = computePriority([rec(true, 'PARENT', 'REJECTED')]);
    expect(r.priority).toBe('NO_GROUP_HISTORY');
    expect(r.reason).toContain('تأیید نشده');
  });

  it('external-only history yields NO_GROUP_HISTORY', () => {
    const r = computePriority([rec(false, 'EXTERNAL', 'NOT_APPLICABLE')]);
    expect(r.priority).toBe('NO_GROUP_HISTORY');
  });

  it('no records at all yields INSUFFICIENT_DATA', () => {
    const r = computePriority([]);
    expect(r.priority).toBe('INSUFFICIENT_DATA');
  });

  it('weights follow the contract 4/3/2/1/0', () => {
    expect(PRIORITY_WEIGHT.VERIFIED_PARENT).toBe(4);
    expect(PRIORITY_WEIGHT.VERIFIED_SUBSIDIARY).toBe(3);
    expect(PRIORITY_WEIGHT.PENDING_VERIFICATION).toBe(2);
    expect(PRIORITY_WEIGHT.NO_GROUP_HISTORY).toBe(1);
    expect(PRIORITY_WEIGHT.INSUFFICIENT_DATA).toBe(0);
  });

  it('NOT_APPLICABLE group-less records never inflate the outcome', () => {
    const r = computePriority([
      rec(false, 'EXTERNAL', 'NOT_APPLICABLE'),
      rec(false, 'EXTERNAL', 'NOT_APPLICABLE'),
    ]);
    expect(r.priority).toBe('NO_GROUP_HISTORY');
  });
});
