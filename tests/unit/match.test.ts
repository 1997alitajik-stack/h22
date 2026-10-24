import { describe, expect, it } from 'vitest';
import { computeMatchScore, matchBreakdownText } from '@/lib/domain/match';
import type { MatchCandidate } from '@/lib/domain/match';

const candidate = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  residentialCity: 'تهران',
  yearsOfExperience: 6,
  groupPriority: 'NO_GROUP_HISTORY',
  skillNames: ['AutoCAD', 'نقشه‌خوانی'],
  ...over,
});

const vacancy = {
  city: 'تهران',
  minYearsExperience: 6,
  requiredSkills: ['AutoCAD', 'نقشه‌خوانی'],
};

describe('transparent match score (contract formula)', () => {
  it('perfect match: 50 + 15 + 15 + skills 15 = 95', () => {
    const b = computeMatchScore(candidate(), vacancy);
    expect(b.total).toBe(95);
    expect(b.cityMatch).toBe(15);
    expect(b.experienceMatch).toBe(15);
    expect(b.priorityBonus).toBe(0);
    expect(b.skillsMatch).toBe(15);
    expect(b.missingSkills).toEqual([]);
  });

  it('city mismatch removes 15', () => {
    const b = computeMatchScore(candidate({ residentialCity: 'اصفهان' }), vacancy);
    expect(b.cityMatch).toBe(0);
    expect(b.total).toBe(80);
  });

  it('insufficient experience removes 15', () => {
    const b = computeMatchScore(candidate({ yearsOfExperience: 3 }), vacancy);
    expect(b.experienceMatch).toBe(0);
    expect(b.total).toBe(80);
  });

  it('verified parent adds 15, verified subsidiary adds 10', () => {
    expect(computeMatchScore(candidate({ groupPriority: 'VERIFIED_PARENT' }), vacancy).priorityBonus).toBe(15);
    expect(computeMatchScore(candidate({ groupPriority: 'VERIFIED_SUBSIDIARY' }), vacancy).priorityBonus).toBe(10);
    expect(computeMatchScore(candidate({ groupPriority: 'PENDING_VERIFICATION' }), vacancy).priorityBonus).toBe(0);
  });

  it('skill coverage scales proportionally (1 of 2 → +8)', () => {
    const b = computeMatchScore(candidate({ skillNames: ['AutoCAD'] }), vacancy);
    expect(b.skillsMatch).toBe(8);
    expect(b.missingSkills).toEqual(['نقشه‌خوانی']);
  });

  it('Persian-normalized skill matching (ي vs ی) still counts', () => {
    const b = computeMatchScore(candidate({ skillNames: ['نقشه‌خواني'] }), vacancy);
    expect(b.matchedSkills).toContain('نقشه‌خوانی');
  });

  it('caps at 99 and never reaches 100', () => {
    const b = computeMatchScore(
      candidate({ groupPriority: 'VERIFIED_PARENT', skillNames: ['a', 'b'] }),
      { city: 'تهران', minYearsExperience: 0, requiredSkills: ['a', 'b', 'c', 'd', 'e'] },
    );
    expect(b.total).toBeLessThanOrEqual(99);
  });

  it('breakdown text is human-readable and lists missing skills', () => {
    const text = matchBreakdownText(computeMatchScore(candidate({ skillNames: [] }), vacancy));
    expect(text).toContain('فاقد');
  });
});
