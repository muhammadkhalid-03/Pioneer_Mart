// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  overrides: [
    {
      files: ['**/__tests__/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'react/display-name': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
