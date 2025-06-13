import { FlatCompat } from '@eslint/eslintrc';
import { config as baseConfig } from './base.js';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/** @type { import("eslint").Linter.FlatConfig[] } */
export const nextJsConfig = [
  ...baseConfig,
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
  }),
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: false,
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
];
