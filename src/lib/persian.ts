/**
 * Persian language utilities — normalization, digits, Jalali dates, masking.
 * Normalization rules must stay in sync with rasta.normalize_fa in migration 0001.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** Normalizes Persian/Arabic text for consistent comparison and search. */
export function normalizePersianText(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[يىئ]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/\u200C/g, ' ')
    .replace(/\s+/g, ' ');
}

export function toPersianDigits(input: number | string | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)] ?? digit);
}

export function toEnglishDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/** Jalali date via ICU — no external date library. */
export function formatJalali(
  value: string | Date | null | undefined,
  withTime = false,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const options: Intl.DateTimeFormatOptions = withTime
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { dateStyle: 'short' };
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(date);
}

export function formatFileSizePersian(bytes: number): string {
  if (bytes <= 0) return '۰ بایت';
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(1))} کیلوبایت`;
  return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export function maskNationalId(v: string | null | undefined): string | null {
  if (!v || v.length < 4) return null;
  return `${toPersianDigits(v.slice(0, 3))}-******-${toPersianDigits(v.slice(-1))}`;
}

export function maskPhone(v: string | null | undefined): string | null {
  if (!v || v.length < 7) return null;
  return `${toPersianDigits(v.slice(0, 4))}-***-${toPersianDigits(v.slice(-4))}`;
}

export function initialsOf(fullName: string): string {
  if (!fullName) return '؟';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 1);
  return `${parts[0]!.charAt(0)}‌${parts[parts.length - 1]!.charAt(0)}`;
}

/** Splits a comma ( Persian or Latin ) separated list into trimmed non-empty items. */
export function splitList(input: string): string[] {
  return input
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
