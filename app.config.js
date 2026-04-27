/* eslint-disable @typescript-eslint/no-var-requires */
// Expo config – merges app.json + env-driven extra (restart Expo after changing .env).
// Data privacy: only non-secret, optional client keys belong in EXPO_PUBLIC_* (they ship in the client bundle).
// Never commit a filled-in .env — use .env.example as the template only.

const appJson = require('./app.json');

module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '',
      /** Default city for Current Weather (no GPS). Override in .env for your region. */
      openWeatherCity: process.env.EXPO_PUBLIC_OPENWEATHER_CITY ?? '',
    },
    plugins: [...(appJson.expo.plugins ?? []), 'expo-notifications'],
  },
});
