const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow importing `.sql` migration files (Drizzle + Expo).
// https://orm.drizzle.team/docs/get-started/expo-new
config.resolver.sourceExts.push('sql');

// `expo-sqlite` web worker imports `./wa-sqlite/wa-sqlite.wasm` — Metro must treat `.wasm` as a resolvable asset
// or `npx expo export --platform web` fails while bundling anything that pulls in `expo-sqlite` (e.g. db client, CSV export).
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
