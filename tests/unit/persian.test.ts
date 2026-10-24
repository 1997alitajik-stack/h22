import { describe, expect, it } from 'vitest';
import {
  normalizePersianText,
  toEnglishDigits,
  toPersianDigits,
  maskNationalId,
  maskPhone,
  formatJalali,
  splitList,
} from '@/lib/persian';

describe('normalizePersianText (must mirror rasta.normalize_fa)', () => {
  it('normalizes Arabic Yeh to Persian Yeh', () => {
    expect(normalizePersianText('علي')).toBe(normalizePersianText('علی'));
  });

  it('normalizes Arabic Kaf to Persian Keh', () => {
    expect(normalizePersianText('مكتب')).toBe(normalizePersianText('مقتب'.replace('ق', 'ک')));
  });

  it('normalizes Alef variants', () => {
    expect(normalizePersianText('آب')).toBe(normalizePersianText('اب'));
    expect(normalizePersianText('أحمد')).toBe(normalizePersianText('احمد'));
    expect(normalizePersianText('إبراهیم')).toBe(normalizePersianText('ابراهیم'));
  });

  it('normalizes Teh Marbuta', () => {
    expect(normalizePersianText('مدرسة')).toBe(normalizePersianText('مدرسه'));
  });

  it('strips diacritics', () => {
    expect(normalizePersianText('مُحَمَّد')).toBe(normalizePersianText('محمد'));
  });

  it('converts Persian and Arabic digits to ASCII for comparison', () => {
    expect(normalizePersianText('۱۲۳')).toBe('123');
    expect(normalizePersianText('٠١٢')).toBe('012');
  });

  it('collapses ZWNJ and whitespace', () => {
    expect(normalizePersianText('مهندسی\u200Cنویسی   فنی')).toBe('مهندسی نویسی فنی');
  });

  it('search equality across variants: حسينAli vs حسینali', () => {
    const q = normalizePersianText('حسين');
    expect(normalizePersianText('حسین').includes(q)).toBe(true);
  });

  it('handles empty and undefined-ish input', () => {
    expect(normalizePersianText('')).toBe('');
    expect(normalizePersianText('   ')).toBe('');
  });
});

describe('digit conversion', () => {
  it('toPersianDigits renders numbers in Persian numerals', () => {
    expect(toPersianDigits(1234)).toBe('۱۲۳۴');
    expect(toPersianDigits('95')).toBe('۹۵');
  });

  it('toEnglishDigits accepts Persian and Arabic digits', () => {
    expect(toEnglishDigits('۰۹۱۲۳۴۲۱۸۹۰')).toBe('09123421890');
    expect(toEnglishDigits('٠٩١٢')).toBe('0912');
  });

  it('round-trips', () => {
    expect(toEnglishDigits(toPersianDigits('1403/08/12'))).toBe('1403/08/12');
  });
});

describe('PII masking', () => {
  it('masks national ID keeping first 3 and last digit', () => {
    expect(maskNationalId('0062384914')).toBe('۰۰۶-******-۴');
  });

  it('masks phone keeping first 4 and last 4', () => {
    expect(maskPhone('09123421890')).toBe('۰۹۱۲-***-۱۸۹۰');
  });

  it('returns null for short/absent values', () => {
    expect(maskNationalId(null)).toBeNull();
    expect(maskPhone('123')).toBeNull();
  });
});

describe('splitList', () => {
  it('splits on Persian and Latin commas and trims', () => {
    expect(splitList('AutoCAD، نقشه‌خوانی, Primavera')).toEqual([
      'AutoCAD',
      'نقشه‌خوانی',
      'Primavera',
    ]);
  });

  it('drops empty segments', () => {
    expect(splitList('a، ، b,')).toEqual(['a', 'b']);
  });
});

describe('formatJalali', () => {
  it('formats an ISO date in the Persian calendar', () => {
    const out = formatJalali('2026-10-19T00:00:00Z');
    expect(out).toMatch(/۱۴۰۵/); // 2026-10 falls in Jalali year 1405
  });

  it('renders an em dash for null/invalid', () => {
    expect(formatJalali(null)).toBe('—');
    expect(formatJalali('not-a-date')).toBe('not-a-date');
  });
});
