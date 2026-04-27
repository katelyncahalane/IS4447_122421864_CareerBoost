import { escapeCsvField, rowsToCsvString, type ApplicationCsvRow } from '@/lib/applications-csv-format';

describe('escapeCsvField', () => {
  it('leaves simple text unquoted', () => {
    expect(escapeCsvField('Acme')).toBe('Acme');
    expect(escapeCsvField('')).toBe('');
  });

  it('wraps fields with commas', () => {
    expect(escapeCsvField('A, B')).toBe('"A, B"');
  });

  it('escapes internal double quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('normalises line breaks and wraps when newline present', () => {
    expect(escapeCsvField('line1\r\nline2')).toBe('"line1\nline2"');
  });
});

describe('rowsToCsvString', () => {
  it('includes BOM and header', () => {
    const csv = rowsToCsvString([]);
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('Id,Company,Role,Status,AppliedDate,MetricValue,CategoryId,CategoryName,Notes');
  });

  it('serialises one row', () => {
    const row: ApplicationCsvRow = {
      id: 1,
      company: 'Co',
      role: 'Dev',
      status: 'Applied',
      appliedDate: '2026-04-01',
      metricValue: 2,
      categoryId: 3,
      categoryName: 'Eng',
      notes: null,
    };
    const csv = rowsToCsvString([row]);
    expect(csv).toContain('\n1,Co,Dev,Applied,2026-04-01,2,3,Eng,');
  });
});
