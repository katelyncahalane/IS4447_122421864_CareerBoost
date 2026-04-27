/**
 * Local reminders — schedules align with prefs (daily / weekly / monthly); native APIs mocked in jest.setup.
 */

import cancelScheduledNotificationAsync from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';

import { syncLocalRemindersFromPrefs } from '@/lib/local-reminders';

const scheduleMock = scheduleNotificationAsync as jest.MockedFunction<typeof scheduleNotificationAsync>;
const cancelMock = cancelScheduledNotificationAsync as jest.MockedFunction<
  typeof cancelScheduledNotificationAsync
>;

describe('syncLocalRemindersFromPrefs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules daily + weekly + monthly when all enabled', async () => {
    await syncLocalRemindersFromPrefs({
      dailyLogEnabled: true,
      dailyHour: 18,
      dailyMinute: 30,
      weeklyTargetsEnabled: true,
      weeklyWeekday: 2,
      weeklyHour: 9,
      weeklyMinute: 0,
      monthlyTargetsEnabled: true,
      monthlyDay: 15,
      monthlyHour: 11,
      monthlyMinute: 45,
    });

    expect(cancelMock).toHaveBeenCalled();
    expect(scheduleMock).toHaveBeenCalledTimes(3);

    const daily = scheduleMock.mock.calls.find((c) => c[0]?.identifier === 'careerboost-reminder-daily-log');
    expect(daily?.[0]?.trigger).toMatchObject({
      type: SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 30,
    });
    expect(daily?.[0]?.content?.data).toEqual({ kind: 'daily-log', route: '/(tabs)' });

    const weekly = scheduleMock.mock.calls.find((c) => c[0]?.identifier === 'careerboost-reminder-weekly-targets');
    expect(weekly?.[0]?.trigger).toMatchObject({
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 9,
      minute: 0,
    });

    const monthly = scheduleMock.mock.calls.find((c) => c[0]?.identifier === 'careerboost-reminder-monthly-targets');
    expect(monthly?.[0]?.trigger).toMatchObject({
      type: SchedulableTriggerInputTypes.MONTHLY,
      day: 15,
      hour: 11,
      minute: 45,
    });
  });

  it('cancels and schedules nothing when every toggle is off', async () => {
    await syncLocalRemindersFromPrefs({
      dailyLogEnabled: false,
      dailyHour: 12,
      dailyMinute: 0,
      weeklyTargetsEnabled: false,
      weeklyWeekday: 2,
      weeklyHour: 9,
      weeklyMinute: 0,
      monthlyTargetsEnabled: false,
      monthlyDay: 1,
      monthlyHour: 10,
      monthlyMinute: 0,
    });
    expect(scheduleMock).not.toHaveBeenCalled();
  });
});
