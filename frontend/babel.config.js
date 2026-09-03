module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already includes the react-native-reanimated plugin,
    // so it must not be added again here.
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [
          // Strip console calls from release builds. Logging crosses the JS
          // bridge on every call and leaks internals to anyone reading device
          // logs. error and warn are kept so crash reporting still works.
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};
