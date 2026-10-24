import { describe, expect, it } from 'vitest';
import { buildCsv, csvCell, csvFilename } from '@/lib/csv';

describe('CSV export safety (mission §4.6)', () => {
  it('prepends UTF-8 BOM for Persian Excel rendering', () => {
    const csv = buildCsv([{ key: 'name', label: 'نام' }], [{ name: 'حسین مرادی' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"حسین مرادی"');
  });

  it('neutralizes formula injection in every dangerous leading character', () => {
    for (const dangerous of ['=cmd()', '+1', '-1', '@SUM(1)', '\t=cmd()', '\r=cmd()']) {
      const cell = csvCell(dangerous);
      expect(cell.startsWith('"\'')).toBe(true);
    }
  });

  it('trims leading whitespace-only prefixes so they are no longer dangerous', () => {
    expect(csvCell('\tTab')).toBe('"Tab"');
  });

  it('escapes embedded double quotes', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('renders null/undefined as empty quoted cell', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('uses CRLF row separators', () => {
    const csv = buildCsv(
      [{ key: 'a', label: 'A' }],
      [
        { a: '1' },
        { a: '2' },
      ],
    );
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('produces a Tehran-dated filename', () => {
    expect(csvFilename('rasta_applicants')).toMatch(/^rasta_applicants_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
