const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow importing `.sql` migration files (Drizzle + Expo).
// https://orm.drizzle.team/docs/get-started/expo-new
config.resolver.sourceExts.push('sql');

module.exports = config;
