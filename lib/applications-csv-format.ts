// CSV formatting for application export (pure helpers – easy to unit test)

export type ApplicationCsvRow = {
  id: number;
  company: string;
  role: string;
  status: string;
  appliedDate: string;
  metricValue: number;
  categoryId: number;
  categoryName: string;
  notes: string | null;
};

const HEADER = [
  'Id',
  'Company',
  'Role',
  'Status',
  'AppliedDate',
  'MetricValue',
  'CategoryId',
  'CategoryName',
  'Notes',
] as const;

/** RFC 4180-style escaping for one text field */
export function escapeCsvField(raw: string): string {
  const s = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** UTF-8 BOM + header + one row per application (Excel-friendly) */
export function rowsToCsvString(rows: ApplicationCsvRow[]): string {
  const lines: string[] = [HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        escapeCsvField(String(r.id)),
        escapeCsvField(r.company),
        escapeCsvField(r.role),
        escapeCsvField(r.status),
        escapeCsvField(r.appliedDate),
        escapeCsvField(String(r.metricValue)),
        escapeCsvField(String(r.categoryId)),
        escapeCsvField(r.categoryName),
        escapeCsvField(r.notes ?? ''),
      ].join(','),
    );
  }
  return `\ufeff${lines.join('\n')}`;
}
