/**
 * Transparent candidate–vacancy match score (no AI, no opaque math).
 * Mirrors the supplied contract formula; every contribution is explainable.
 *   base 50 · city match +15 · experience sufficiency +15
 *   priority bonus +15 (parent) / +10 (subsidiary)
 *   required-skills coverage scaled to +15 · capped at 99
 */
import type { GroupPriority, MatchBreakdown } from '@/types';
import { normalizePersianText } from '@/lib/persian';

export interface MatchCandidate {
  residentialCity: string | null;
  yearsOfExperience: number;
  groupPriority: GroupPriority;
  skillNames: string[];
}

export interface MatchVacancy {
  city: string;
  minYearsExperience: number;
  requiredSkills: string[];
}

export function computeMatchScore(candidate: MatchCandidate, vacancy: MatchVacancy): MatchBreakdown {
  let total = 50;
  const breakdown: MatchBreakdown = {
    base: 50,
    cityMatch: 0,
    experienceMatch: 0,
    priorityBonus: 0,
    skillsMatch: 0,
    matchedSkills: [],
    missingSkills: [],
    total: 0,
  };

  if (
    candidate.residentialCity &&
    normalizePersianText(candidate.residentialCity) === normalizePersianText(vacancy.city)
  ) {
    breakdown.cityMatch = 15;
    total += 15;
  }

  if (candidate.yearsOfExperience >= vacancy.minYearsExperience) {
    breakdown.experienceMatch = 15;
    total += 15;
  }

  if (candidate.groupPriority === 'VERIFIED_PARENT') {
    breakdown.priorityBonus = 15;
    total += 15;
  } else if (candidate.groupPriority === 'VERIFIED_SUBSIDIARY') {
    breakdown.priorityBonus = 10;
    total += 10;
  }

  if (vacancy.requiredSkills.length > 0) {
    const candidateNorms = candidate.skillNames.map((s) => normalizePersianText(s));
    for (const required of vacancy.requiredSkills) {
      const requiredNorm = normalizePersianText(required);
      if (candidateNorms.some((c) => c.includes(requiredNorm) || requiredNorm.includes(c))) {
        breakdown.matchedSkills.push(required);
      } else {
        breakdown.missingSkills.push(required);
      }
    }
    breakdown.skillsMatch = Math.round(
      (breakdown.matchedSkills.length / vacancy.requiredSkills.length) * 15,
    );
    total += breakdown.skillsMatch;
  }

  breakdown.total = Math.min(total, 99);
  return breakdown;
}

export function matchBreakdownText(b: MatchBreakdown): string {
  const parts = [
    `پایه: ${b.base}`,
    `شهر: +${b.cityMatch}`,
    `سابقه: +${b.experienceMatch}`,
    `اولویت سازمانی: +${b.priorityBonus}`,
    `مهارت‌های الزامی: +${b.skillsMatch} از ۱۵`,
  ];
  if (b.missingSkills.length > 0) parts.push(`فاقد: ${b.missingSkills.join('، ')}`);
  return parts.join(' · ');
}
