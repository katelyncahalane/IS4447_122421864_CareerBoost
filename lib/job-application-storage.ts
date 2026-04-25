import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@is4447/single_job_application_v1';

export type JobApplication = {
  company: string;
  role: string;
  status: string;
  notes: string;
};

/** Shown once on first launch; user can edit, replace, or delete it. */
export const SAMPLE_JOB_APPLICATION: JobApplication = {
  company: 'Example Tech Ltd',
  role: 'Junior Developer',
  status: 'Applied',
  notes: 'Submitted CV on the company careers page.',
};

type PersistShape = { application: JobApplication | null };

export async function loadJobApplication(): Promise<JobApplication | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    const initial: PersistShape = { application: { ...SAMPLE_JOB_APPLICATION } };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial.application;
  }
  try {
    const data = JSON.parse(raw) as PersistShape;
    if (data && typeof data === 'object' && 'application' in data) {
      return data.application ?? null;
    }
  } catch {
    /* fall through */
  }
  const fallback: PersistShape = { application: { ...SAMPLE_JOB_APPLICATION } };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  return fallback.application;
}

export async function saveJobApplication(application: JobApplication): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ application }));
}

export async function deleteJobApplication(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ application: null }));
}
