// Local notification schedules — daily logging nudge, weekly + monthly target reviews (no server; native only).
//
// Imports use `expo-notifications/build/*` entry points (not the package barrel) so Metro does not evaluate
// `getExpoPushTokenAsync` / `DevicePushTokenAutoRegistration` at load time — that path throws in Expo Go on Android (SDK 53+).
//
// References — scheduling & Android channels:
// - expo-notifications (scheduling): https://docs.expo.dev/versions/latest/sdk/notifications/#scheduling-notifications
// - Android notification channels: https://developer.android.com/develop/ui/views/notifications/notification-channel
// - Expo notifications GitHub (issues): https://github.com/expo/expo/tree/main/packages/expo-notifications
// - React Native AppState (optional future: reschedule on resume): https://reactnative.dev/docs/appstate
// - Video (Expo Notifications intro): https://www.youtube.com/watch?v=_mvmUW6s6uo

import cancelScheduledNotificationAsync from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync';
import { Platform } from 'react-native';

import { getReminderPrefs, type ReminderPrefs } from '@/lib/notification-preferences';

const ANDROID_CHANNEL_ID = 'careerboost-reminders';

export const REMINDER_NOTIFICATION_IDS = {
  dailyLog: 'careerboost-reminder-daily-log',
  weeklyTargets: 'careerboost-reminder-weekly-targets',
  monthlyTargets: 'careerboost-reminder-monthly-targets',
} as const;

function androidTriggerExtra(): { channelId?: string } {
  return Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {};
}

async function assertAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'CareerBoost reminders',
    description: 'On-device schedules for application logging and target progress.',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 220],
  });
}

async function ensurePermissions(): Promise<boolean> {
  const existing = await getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const req = await requestPermissionsAsync();
  return req.status === 'granted';
}

async function cancelOurSchedules(): Promise<void> {
  await cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_IDS.dailyLog).catch(() => {});
  await cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_IDS.weeklyTargets).catch(() => {});
  await cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_IDS.monthlyTargets).catch(() => {});
}

/** Apply prefs: schedules local repeating notifications on iOS/Android; no-op on web. */
export async function syncLocalRemindersFromPrefs(prefs: ReminderPrefs): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelOurSchedules();

  if (!prefs.dailyLogEnabled && !prefs.weeklyTargetsEnabled && !prefs.monthlyTargetsEnabled) {
    return;
  }

  const ok = await ensurePermissions();
  if (!ok) {
    throw new Error(
      'Notification permission was denied. Turn reminders on again after allowing alerts in system Settings.',
    );
  }

  await assertAndroidChannel();

  const ax = androidTriggerExtra();

  if (prefs.dailyLogEnabled) {
    await scheduleNotificationAsync({
      identifier: REMINDER_NOTIFICATION_IDS.dailyLog,
      content: {
        title: 'CareerBoost, log activity',
        body: 'Log new applications or status updates on the Tracker tab while they are fresh.',
        data: { kind: 'daily-log', route: '/(tabs)' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: prefs.dailyHour,
        minute: prefs.dailyMinute,
        ...ax,
      },
    });
  }

  if (prefs.weeklyTargetsEnabled) {
    // weekday: 1 = Sunday … 2 = Monday (expo-notifications)
    await scheduleNotificationAsync({
      identifier: REMINDER_NOTIFICATION_IDS.weeklyTargets,
      content: {
        title: 'CareerBoost, weekly targets',
        body: 'Review weekly progress and remaining counts on the Targets tab.',
        data: { kind: 'weekly-targets', route: '/(tabs)/targets' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: prefs.weeklyWeekday,
        hour: prefs.weeklyHour,
        minute: prefs.weeklyMinute,
        ...ax,
      },
    });
  }

  if (prefs.monthlyTargetsEnabled) {
    await scheduleNotificationAsync({
      identifier: REMINDER_NOTIFICATION_IDS.monthlyTargets,
      content: {
        title: 'CareerBoost, monthly targets',
        body: 'Check monthly goals and rollover for the new period on the Targets tab.',
        data: { kind: 'monthly-targets', route: '/(tabs)/targets' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.MONTHLY,
        day: prefs.monthlyDay,
        hour: prefs.monthlyHour,
        minute: prefs.monthlyMinute,
        ...ax,
      },
    });
  }
}

/** Load saved prefs from storage and re-apply OS schedules (call after migrations or logging activity). */
export async function loadPrefsAndSyncReminders(): Promise<void> {
  const prefs = await getReminderPrefs();
  await syncLocalRemindersFromPrefs(prefs);
}
