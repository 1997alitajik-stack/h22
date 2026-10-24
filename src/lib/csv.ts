/**
 * Server-side CSV generation with UTF-8 BOM (Persian Excel support) and
 * spreadsheet formula-injection neutralization (mission §4.6).
 */

/** Escapes one cell; dangerous leading characters are defused with a quote. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export interface CsvColumn {
  key: string;
  label: string;
}

export function buildCsv(headers: CsvColumn[], rows: Record<string, string | number | null | undefined>[]): string {
  const headerRow = headers.map((h) => csvCell(h.label)).join(',');
  const dataRows = rows.map((row) => headers.map((h) => csvCell(row[h.key])).join(','));
  // BOM keeps Persian text intact when opened in Microsoft Excel.
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

export function csvFilename(prefix: string): string {
  const now = new Date();
  const stamp = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).replace(/-/g, '-');
  return `${prefix}_${stamp}.csv`;
}
