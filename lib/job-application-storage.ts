// legacy asyncstorage demo – single fake job card (not used by sqlite list)

// imports
import AsyncStorage from '@react-native-async-storage/async-storage';

// constant – old storage key from earlier prototype
const STORAGE_KEY = '@is4447/single_job_application_v1';

// types – flat fields for one saved card
export type JobApplication = {
  company: string;
  role: string;
  status: string;
  notes: string;
};

// constant – first-run sample if storage empty
export const SAMPLE_JOB_APPLICATION: JobApplication = {
  company: 'Example Tech Ltd',
  role: 'Junior Developer',
  status: 'Applied',
  notes: 'Submitted CV on the company careers page.',
};

// internal shape – wrap application in an object for future fields
type PersistShape = { application: JobApplication | null };

// read – seed once then return stored object
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
    /* ignore bad json */
  }
  const fallback: PersistShape = { application: { ...SAMPLE_JOB_APPLICATION } };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  return fallback.application;
}

// write – replace stored card
export async function saveJobApplication(application: JobApplication): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ application }));
}

// delete – clear card but keep wrapper object
export async function deleteJobApplication(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ application: null }));
}
