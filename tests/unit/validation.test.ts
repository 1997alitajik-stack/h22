import { describe, expect, it } from 'vitest';
import {
  applicantFormSchema,
  jalaliDate,
  nationalIdSchema,
  phoneSchema,
  verifyEmploymentSchema,
  vacancyFormSchema,
} from '@/lib/validation';

describe('Jalali date validation', () => {
  it('accepts canonical Persian-digit dates and normalizes to ASCII', () => {
    const r = jalaliDate.parse('۱۳۷۰/۰۵/۱۴');
    expect(r).toBe('1370/05/14');
  });

  it('accepts ASCII dates', () => {
    expect(jalaliDate.parse('1370/05/14')).toBe('1370/05/14');
  });

  it('rejects invalid month/day and Gregorian years', () => {
    expect(jalaliDate.safeParse('1370/13/01').success).toBe(false);
    expect(jalaliDate.safeParse('1370/05/32').success).toBe(false);
    expect(jalaliDate.safeParse('2026/10/19').success).toBe(false);
  });

  it('maps empty string to undefined (missing value stays missing)', () => {
    expect(jalaliDate.parse('')).toBeUndefined();
  });
});

describe('national ID and phone', () => {
  it('accepts 10-digit IDs in either digit system', () => {
    expect(nationalIdSchema.parse('۰۰۶۲۳۸۴۹۱۴')).toBe('0062384914');
    expect(nationalIdSchema.parse('0062384914')).toBe('0062384914');
  });

  it('rejects wrong length', () => {
    expect(nationalIdSchema.safeParse('12345').success).toBe(false);
    expect(nationalIdSchema.safeParse('12345678901').success).toBe(false);
  });

  it('accepts 8–14 digit phones only', () => {
    expect(phoneSchema.parse('۰۹۱۲۳۴۲۱۸۹۰')).toBe('09123421890');
    expect(phoneSchema.safeParse('123').success).toBe(false);
  });
});

describe('applicant form schema', () => {
  const base = {
    firstName: 'حسین',
    lastName: 'مرادی',
    residentialCity: 'تهران',
    primaryJobTitle: 'مهندس سازه',
    primaryJobCategory: 'مهندسی عمران و سازه',
    yearsOfExperience: 10,
  };

  it('accepts a minimal honest payload without fabricated defaults', () => {
    const r = applicantFormSchema.parse(base);
    expect(r.employment).toEqual([]);
    expect(r.education).toEqual([]);
    expect(r.skillsCsv).toBe('');
  });

  it('rejects missing required fields', () => {
    const r = applicantFormSchema.safeParse({ ...base, firstName: '  ' });
    expect(r.success).toBe(false);
  });

  it('requires end date for a finished employment record', () => {
    const r = applicantFormSchema.safeParse({
      ...base,
      employment: [
        {
          employerName: 'شرکت الف',
          jobTitle: 'مهندس',
          startDate: '1398/01/01',
          endDate: '',
          isCurrent: false,
          isGroupEntity: false,
          groupEntityType: 'EXTERNAL',
        },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.issues)).toContain('تاریخ پایان');
    }
  });

  it('accepts current employment without end date', () => {
    const r = applicantFormSchema.safeParse({
      ...base,
      employment: [
        {
          employerName: 'شرکت الف',
          jobTitle: 'مهندس',
          startDate: '1398/01/01',
          isCurrent: true,
          isGroupEntity: true,
          groupEntityType: 'PARENT',
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('caps experience at 60 years', () => {
    expect(applicantFormSchema.safeParse({ ...base, yearsOfExperience: 61 }).success).toBe(false);
  });
});

describe('vacancy form organization hierarchy', () => {
  const parentVacancy = {
    title: 'سرپرست دفتر فنی',
    category: 'مهندسی عمران و سازه',
    organizationType: 'PARENT',
    organizationName: 'هلدینگ مادر',
    city: 'تهران',
    openPositionsCount: '1',
    employmentType: 'FULL_TIME',
    minYearsExperience: '0',
    requiredSkillsCsv: '',
    preferredSkillsCsv: '',
  };

  it('accepts a parent holding vacancy without a subsidiary or project link', () => {
    const parsed = vacancyFormSchema.safeParse(parentVacancy);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.status).toBe('OPEN');
  });

  it('requires a company when the vacancy is for a subsidiary', () => {
    const parsed = vacancyFormSchema.safeParse({
      ...parentVacancy,
      organizationType: 'SUBSIDIARY',
      organizationName: '',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(JSON.stringify(parsed.error.issues)).toContain('انتخاب شرکت');
  });

  it('does not allow a parent vacancy to be attached to a project', () => {
    const parsed = vacancyFormSchema.safeParse({
      ...parentVacancy,
      projectId: crypto.randomUUID(),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(JSON.stringify(parsed.error.issues)).toContain('پروژه باید');
  });
});

describe('verification schema enforces documented reasons', () => {
  it('allows verify with notes', () => {
    const r = verifyEmploymentSchema.safeParse({
      recordId: crypto.randomUUID(),
      status: 'VERIFIED',
      notes: 'بر اساس پرونده بیمه',
    });
    expect(r.success).toBe(true);
  });

  it('still requires a recordId uuid', () => {
    const r = verifyEmploymentSchema.safeParse({ recordId: 'x', status: 'VERIFIED', notes: '' });
    expect(r.success).toBe(false);
  });
});
