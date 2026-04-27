// Export all stored applications to CSV; save under documents / cache and open share sheet (native) or download (web)

import { desc, eq } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';

import { type ApplicationCsvRow, rowsToCsvString } from './applications-csv-format';

function exportFilename(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  return `careerboost-applications-${stamp}.csv`;
}

export async function loadAllApplicationsForCsv(): Promise<ApplicationCsvRow[]> {
  return db
    .select({
      id: applications.id,
      company: applications.company,
      role: applications.role,
      status: applications.status,
      appliedDate: applications.appliedDate,
      metricValue: applications.metricValue,
      categoryId: applications.categoryId,
      categoryName: categories.name,
      notes: applications.notes,
    })
    .from(applications)
    .innerJoin(categories, eq(applications.categoryId, categories.id))
    .orderBy(desc(applications.appliedDate));
}

function triggerWebDownload(csv: string, filename: string): void {
  if (typeof document === 'undefined') {
    throw new Error('Download is only available in a browser.');
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Writes every saved application (not the current list filters) to a CSV file and opens the
 * system share sheet on iOS/Android, or triggers a browser download on web.
 */
export async function exportAndShareApplicationsCsv(): Promise<{ rowCount: number }> {
  const rows = await loadAllApplicationsForCsv();
  const csv = rowsToCsvString(rows);
  const filename = exportFilename();

  if (Platform.OS === 'web') {
    triggerWebDownload(csv, filename);
    return { rowCount: rows.length };
  }

  const out = new File(Paths.document, filename);
  out.create({ overwrite: true });
  out.write(csv, { encoding: 'utf8' });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device. The file was saved in app storage.');
  }

  const shareUri =
    Platform.OS === 'android' && typeof out.contentUri === 'string' && out.contentUri.length > 0
      ? out.contentUri
      : out.uri;

  await Sharing.shareAsync(shareUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export applications',
    UTI: 'public.comma-separated-values-text',
  });
  return { rowCount: rows.length };
}
