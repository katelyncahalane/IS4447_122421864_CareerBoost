import AsyncStorage from '@react-native-async-storage/async-storage';

import { getReminderPrefs } from '@/lib/notification-preferences';

describe('getReminderPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('fills monthly defaults when stored JSON predates monthly fields', async () => {
    await AsyncStorage.setItem(
      '@careerboost/local_reminder_prefs_v1',
      JSON.stringify({
        dailyLogEnabled: false,
        dailyHour: 7,
        dailyMinute: 5,
        weeklyTargetsEnabled: true,
        weeklyWeekday: 4,
        weeklyHour: 8,
        weeklyMinute: 10,
      }),
    );

    const prefs = await getReminderPrefs();
    expect(prefs.monthlyTargetsEnabled).toBe(false);
    expect(prefs.monthlyDay).toBe(1);
    expect(prefs.monthlyHour).toBe(10);
    expect(prefs.monthlyMinute).toBe(0);
    expect(prefs.weeklyWeekday).toBe(4);
  });
});
