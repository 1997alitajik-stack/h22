import { describe, expect, it } from 'vitest';
import { computeMatchScore, matchBreakdownText } from '@/lib/domain/match';
import type { MatchCandidate, MatchVacancy } from '@/lib/domain/match';

const candidate = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  residentialCity: 'تهران',
  yearsOfExperience: 6,
  groupPriority: 'NO_GROUP_HISTORY',
  skillNames: ['AutoCAD', 'نقشه‌خوانی'],
  primaryJobTitle: 'مهندس عمران',
  primaryJobCategory: 'مهندسی عمران و سازه',
  preferredTitles: ['کارشناس دفتر فنی'],
  preferredCities: [],
  previousOrganizationIds: [],
  previousProjectNames: [],
  highestDegree: 'BACHELOR',
  ...over,
});

const vacancy: MatchVacancy = {
  title: 'مهندس عمران',
  category: 'مهندسی عمران و سازه',
  city: 'تهران',
  minYearsExperience: 6,
  requiredSkills: ['AutoCAD', 'نقشه‌خوانی'],
  organizationType: 'SUBSIDIARY',
  requiredDegree: 'BACHELOR',
};

describe('transparent vacancy recommendation score', () => {
  it('gives full role, city, experience, skill and degree points', () => {
    const b = computeMatchScore(candidate(), vacancy);
    expect(b.total).toBe(95);
    expect(b.categoryMatch).toBe(25);
    expect(b.titleMatch).toBe(15);
    expect(b.cityMatch).toBe(10);
    expect(b.experienceMatch).toBe(10);
    expect(b.skillsMatch).toBe(15);
    expect(b.degreeMatch).toBe(5);
    expect(b.missingSkills).toEqual([]);
  });

  it('reduces score when the candidate lives in another city', () => {
    const b = computeMatchScore(candidate({ residentialCity: 'اصفهان' }), vacancy);
    expect(b.cityMatch).toBe(0);
    expect(b.total).toBe(85);
  });

  it('requires exact job category for automatic recommendations', () => {
    const b = computeMatchScore(candidate({ primaryJobCategory: 'امور مالی و حسابداری' }), vacancy);
    expect(b.categoryMatch).toBe(0);
    expect(b.total).toBe(70);
  });

  it('scores partial experience, missing skills, and parent/subsidiary history transparently', () => {
    const b = computeMatchScore(
      candidate({
        yearsOfExperience: 3,
        skillNames: ['AutoCAD'],
        groupPriority: 'VERIFIED_SUBSIDIARY',
        previousOrganizationIds: ['org-1'],
      }),
      { ...vacancy, organizationId: 'org-1' },
    );
    expect(b.experienceMatch).toBe(0);
    expect(b.skillsMatch).toBe(8);
    expect(b.priorityBonus).toBe(5);
    expect(b.organizationMatch).toBe(5);
    expect(b.missingSkills).toEqual(['نقشه‌خوانی']);
  });

  it('adds preferred-city points and accepts a higher degree', () => {
    const b = computeMatchScore(
      candidate({ preferredCities: ['تهران'], highestDegree: 'MASTER' }),
      vacancy,
    );
    expect(b.preferredCityMatch).toBe(5);
    expect(b.degreeMatch).toBe(5);
  });

  it('caps the score at 100', () => {
    const b = computeMatchScore(
      candidate({
        groupPriority: 'VERIFIED_SUBSIDIARY',
        previousOrganizationIds: ['org-1'],
        preferredCities: ['تهران'],
        highestDegree: 'DOCTORATE',
      }),
      { ...vacancy, organizationId: 'org-1', projectName: 'پروژه الف' },
    );
    expect(b.total).toBeLessThanOrEqual(100);
  });

  it('explains the score and lists missing skills', () => {
    const text = matchBreakdownText(computeMatchScore(candidate({ skillNames: [] }), vacancy));
    expect(text).toContain('حوزه شغلی');
    expect(text).toContain('فاقد');
  });
});
