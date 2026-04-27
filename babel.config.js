module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Bundles `.sql` migration files as strings (required for Drizzle + Expo).
    // https://orm.drizzle.team/docs/get-started/expo-new
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
