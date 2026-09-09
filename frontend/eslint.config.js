// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'node_modules/*'],
  },
  {
    // Conventions this codebase has been bitten by. Each of these was a real
    // bug, not a style preference -- see ARCHITECTURE.md for the history.
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    rules: {
      // A literal " or ' in JSX text is unambiguous and renders identically
      // either way; escaping 33 user-facing strings would only make the copy
      // harder to read. > and } stay flagged -- those genuinely are ambiguous.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],

      'no-restricted-imports': ['error', {
        paths: [{
          name: 'react-native',
          importNames: ['SafeAreaView'],
          message:
            "React Native's SafeAreaView is a no-op on Android. Import it from " +
            "'react-native-safe-area-context' instead.",
        }],
      }],
      // Enforced: both migrations are complete, so these must stay at zero.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='StatusBar']",
          message:
            'Do not render StatusBar per screen -- competing instances fight and ' +
            'the last mount wins. Call useSystemBars({ top }) instead, which ' +
            'derives the icon colour from what the screen paints.',
        },
      ],

      // Enforced: the migration is complete, so this must stay at zero. Calls to
      // third-party hosts are the one exception and live in src/utils, which is
      // exempted below -- apiClient would attach our bearer token to them.
      'no-restricted-properties': ['error',
        { object: 'axios', property: 'get' },
        { object: 'axios', property: 'post' },
        { object: 'axios', property: 'put' },
        { object: 'axios', property: 'patch' },
        { object: 'axios', property: 'delete' },
      ],
    },
  },
  {
    // The layers that are allowed to do the things above.
    files: ['src/services/**', 'src/utils/**', 'src/app/index.tsx'],
    rules: { 'no-restricted-syntax': 'off', 'no-restricted-properties': 'off' },
  },
]);
