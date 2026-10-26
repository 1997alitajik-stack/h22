/**
 * Explainable candidate-to-vacancy fit score. All weights are visible in the
 * breakdown so HR can review recommendations instead of treating them as AI decisions.
 */
import type { DegreeLevel, GroupPriority, MatchBreakdown, OrgType } from '@/types';
import { normalizePersianText } from '@/lib/persian';

export interface MatchCandidate {
  residentialCity: string | null;
  yearsOfExperience: number;
  groupPriority: GroupPriority;
  skillNames: string[];
  primaryJobTitle?: string | null;
  primaryJobCategory?: string | null;
  preferredTitles?: string[];
  preferredCities?: string[];
  previousOrganizationIds?: string[];
  previousProjectNames?: string[];
  highestDegree?: DegreeLevel | null;
}

export interface MatchVacancy {
  title?: string;
  category?: string;
  city: string;
  minYearsExperience: number;
  requiredSkills: string[];
  organizationType?: OrgType;
  organizationId?: string | null;
  projectName?: string | null;
  requiredDegree?: DegreeLevel | null;
}

const DEGREE_RANK: Record<DegreeLevel, number> = {
  UNDER_DIPLOMA: 0,
  DIPLOMA: 1,
  ASSOCIATE: 2,
  BACHELOR: 3,
  MASTER: 4,
  DOCTORATE: 5,
};

function normalized(value: string | null | undefined): string {
  return normalizePersianText(value ?? '').trim();
}

function titleScore(vacancyTitle: string, candidateTitles: string[]): number {
  const target = normalized(vacancyTitle);
  if (!target) return 0;
  const titles = candidateTitles.map(normalized).filter(Boolean);
  if (titles.some((value) => value === target || value.includes(target) || target.includes(value))) return 15;

  const targetTokens = target.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1);
  if (targetTokens.length === 0) return 0;
  const overlaps = titles.some((value) => {
    const candidateTokens = new Set(value.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1));
    const common = targetTokens.filter((token) => candidateTokens.has(token)).length;
    return common >= Math.max(1, Math.ceil(targetTokens.length / 2));
  });
  return overlaps ? 8 : 0;
}

export function computeMatchScore(candidate: MatchCandidate, vacancy: MatchVacancy): MatchBreakdown {
  const breakdown: MatchBreakdown = {
    base: 5,
    categoryMatch: 0,
    titleMatch: 0,
    cityMatch: 0,
    experienceMatch: 0,
    priorityBonus: 0,
    organizationMatch: 0,
    skillsMatch: 0,
    preferredCityMatch: 0,
    degreeMatch: 0,
    matchedSkills: [],
    missingSkills: [],
    total: 5,
  };

  if (
    normalized(candidate.primaryJobCategory) &&
    normalized(vacancy.category) &&
    normalized(candidate.primaryJobCategory) === normalized(vacancy.category)
  ) {
    breakdown.categoryMatch = 25;
  }

  if (vacancy.title) {
    breakdown.titleMatch = titleScore(vacancy.title, [
      candidate.primaryJobTitle ?? '',
      ...(candidate.preferredTitles ?? []),
    ]);
  }

  if (
    candidate.residentialCity &&
    normalized(candidate.residentialCity) === normalized(vacancy.city)
  ) {
    breakdown.cityMatch = 10;
  }

  if (candidate.yearsOfExperience >= vacancy.minYearsExperience) {
    breakdown.experienceMatch = 10;
  }

  if (
    (vacancy.organizationType === 'PARENT' && candidate.groupPriority === 'VERIFIED_PARENT') ||
    (vacancy.organizationType === 'SUBSIDIARY' && candidate.groupPriority === 'VERIFIED_SUBSIDIARY')
  ) {
    breakdown.priorityBonus = 5;
  } else if (!vacancy.organizationType) {
    if (candidate.groupPriority === 'VERIFIED_PARENT') breakdown.priorityBonus = 5;
    else if (candidate.groupPriority === 'VERIFIED_SUBSIDIARY') breakdown.priorityBonus = 3;
  }

  const previousOrganizationIds = candidate.previousOrganizationIds ?? [];
  if (vacancy.organizationId && previousOrganizationIds.includes(vacancy.organizationId)) {
    breakdown.organizationMatch = 5;
  } else if (
    vacancy.projectName &&
    (candidate.previousProjectNames ?? []).some(
      (name) => normalized(name) === normalized(vacancy.projectName),
    )
  ) {
    breakdown.organizationMatch = 3;
  }

  if (vacancy.requiredSkills.length > 0) {
    const candidateNorms = candidate.skillNames.map(normalized).filter(Boolean);
    for (const required of vacancy.requiredSkills) {
      const requiredNorm = normalized(required);
      if (requiredNorm && candidateNorms.some((item) => item.includes(requiredNorm) || requiredNorm.includes(item))) {
        breakdown.matchedSkills.push(required);
      } else {
        breakdown.missingSkills.push(required);
      }
    }
    breakdown.skillsMatch = Math.round(
      (breakdown.matchedSkills.length / vacancy.requiredSkills.length) * 15,
    );
  }

  if ((candidate.preferredCities ?? []).some((city) => normalized(city) === normalized(vacancy.city))) {
    breakdown.preferredCityMatch = 5;
  }

  if (!vacancy.requiredDegree) {
    breakdown.degreeMatch = 5;
  } else if (
    candidate.highestDegree &&
    DEGREE_RANK[candidate.highestDegree] >= DEGREE_RANK[vacancy.requiredDegree]
  ) {
    breakdown.degreeMatch = 5;
  }

  breakdown.total = Math.min(
    breakdown.base +
      breakdown.categoryMatch +
      breakdown.titleMatch +
      breakdown.cityMatch +
      breakdown.experienceMatch +
      breakdown.priorityBonus +
      breakdown.organizationMatch +
      breakdown.skillsMatch +
      breakdown.preferredCityMatch +
      breakdown.degreeMatch,
    100,
  );

  return breakdown;
}

export function matchBreakdownText(b: MatchBreakdown): string {
  const parts = [
    'پایه: +' + (b.base ?? 0),
    'حوزه شغلی: +' + (b.categoryMatch ?? 0),
    'عنوان شغلی: +' + (b.titleMatch ?? 0),
    'شهر: +' + (b.cityMatch ?? 0),
    'سابقه: +' + (b.experienceMatch ?? 0),
    'اولویت هلدینگ/شرکت: +' + (b.priorityBonus ?? 0),
    'سابقه در شرکت/پروژه مرتبط: +' + (b.organizationMatch ?? 0),
    'مهارت‌های الزامی: +' + (b.skillsMatch ?? 0) + ' از ۱۵',
    'شهر ترجیحی: +' + (b.preferredCityMatch ?? 0),
    'مدرک تحصیلی: +' + (b.degreeMatch ?? 0),
  ];
  if ((b.missingSkills ?? []).length > 0) parts.push('فاقد: ' + b.missingSkills.join('، '));
  return parts.join(' · ');
}
