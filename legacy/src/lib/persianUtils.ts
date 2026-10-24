/**
 * Persian language utilities, normalization, and safe data formatting
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Normalizes Persian and Arabic text for consistent search comparison
 */
export function normalizePersianText(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    // Normalize Arabic Yeh and Alef Maksura to Persian Yeh
    .replace(/[يىئ]/g, 'ی')
    // Normalize Arabic Kaf to Persian Keh
    .replace(/[ك]/g, 'ک')
    // Normalize Arabic Teh Marbuta to Heh
    .replace(/[ة]/g, 'ه')
    // Normalize variants of Alef
    .replace(/[آأإ]/g, 'ا')
    // Remove diacritics / vowels (Tanwin, Sukun, Fatha, Damma, Kasra, Shadda)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Persian/Arabic digits to ASCII digits for uniform comparison
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    // Normalize half-space (ZWNJ) and multiple spaces to single space
    .replace(/\u200C/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Converts English or number digits to Persian digits
 */
export function toPersianDigits(input: number | string | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  return str.replace(/\d/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)] ?? digit);
}

/**
 * Converts Persian and Arabic digits to ASCII English digits
 */
export function toEnglishDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Formats file size in readable Persian string
 */
export function formatFileSizePersian(bytes: number): string {
  if (bytes <= 0) return '۰ بایت';
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1);
    return `${toPersianDigits(kb)} کیلوبایت`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${toPersianDigits(mb)} مگابایت`;
}

/**
 * Prevents CSV formula injection by prepending single quote if value begins with dangerous characters
 */
function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  let str = String(value).trim();
  // Escape formulas
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape internal double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports data array to CSV file with UTF-8 BOM for Persian Excel support
 */
export function exportToCsv(
  filename: string,
  headers: { key: string; label: string }[],
  rows: Record<string, any>[]
): void {
  // Add UTF-8 BOM (\uFEFF) so Excel correctly displays Persian letters
  const headerRow = headers.map((h) => sanitizeCsvCell(h.label)).join(',');
  const dataRows = rows.map((row) =>
    headers.map((h) => sanitizeCsvCell(row[h.key])).join(',')
  );

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
