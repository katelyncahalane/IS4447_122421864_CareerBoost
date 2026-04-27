// Persisted toggles for local reminders (AsyncStorage) — daily logging, weekly + monthly target checks.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@careerboost/local_reminder_prefs_v1';

export type ReminderPrefs = {
  dailyLogEnabled: boolean;
  dailyHour: number;
  dailyMinute: number;
  weeklyTargetsEnabled: boolean;
  /** 1–7 expo weekday (1 = Sunday, 2 = Monday) */
  weeklyWeekday: number;
  weeklyHour: number;
  weeklyMinute: number;
  /** First day of each month (clamped 1–28 for short months). */
  monthlyTargetsEnabled: boolean;
  monthlyDay: number;
  monthlyHour: number;
  monthlyMinute: number;
};

const DEFAULTS: ReminderPrefs = {
  dailyLogEnabled: false,
  dailyHour: 18,
  dailyMinute: 30,
  weeklyTargetsEnabled: false,
  weeklyWeekday: 2,
  weeklyHour: 9,
  weeklyMinute: 0,
  monthlyTargetsEnabled: false,
  monthlyDay: 1,
  monthlyHour: 10,
  monthlyMinute: 0,
};

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return DEFAULTS.dailyHour;
  return Math.min(23, Math.max(0, Math.floor(n)));
}

function clampMinute(n: number): number {
  if (!Number.isFinite(n)) return DEFAULTS.dailyMinute;
  return Math.min(59, Math.max(0, Math.floor(n)));
}

function clampWeekday(n: number): number {
  if (!Number.isFinite(n)) return DEFAULTS.weeklyWeekday;
  return Math.min(7, Math.max(1, Math.floor(n)));
}

/** Day-of-month for monthly trigger; cap at 28 so February always fires. */
function clampMonthDay(n: number): number {
  if (!Number.isFinite(n)) return DEFAULTS.monthlyDay;
  return Math.min(28, Math.max(1, Math.floor(n)));
}

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    const p = JSON.parse(raw) as Partial<ReminderPrefs>;
    return {
      dailyLogEnabled: Boolean(p.dailyLogEnabled),
      dailyHour: clampHour(p.dailyHour ?? DEFAULTS.dailyHour),
      dailyMinute: clampMinute(p.dailyMinute ?? DEFAULTS.dailyMinute),
      weeklyTargetsEnabled: Boolean(p.weeklyTargetsEnabled),
      weeklyWeekday: clampWeekday(p.weeklyWeekday ?? DEFAULTS.weeklyWeekday),
      weeklyHour: clampHour(p.weeklyHour ?? DEFAULTS.weeklyHour),
      weeklyMinute: clampMinute(p.weeklyMinute ?? DEFAULTS.weeklyMinute),
      monthlyTargetsEnabled: Boolean(p.monthlyTargetsEnabled),
      monthlyDay: clampMonthDay(p.monthlyDay ?? DEFAULTS.monthlyDay),
      monthlyHour: clampHour(p.monthlyHour ?? DEFAULTS.monthlyHour),
      monthlyMinute: clampMinute(p.monthlyMinute ?? DEFAULTS.monthlyMinute),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setReminderPrefs(next: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
