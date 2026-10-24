import nextConfig from 'eslint-config-next';

/**
 * eslint-config-next (v16) ships a native flat-config array.
 * Appended: strict no-any rule and ignores for legacy/checkout artifacts.
 */
const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: [
      'legacy/**',
      'node_modules/**',
      '.next/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
];

export default eslintConfig;
