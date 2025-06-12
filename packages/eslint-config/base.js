import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

/** @type { import("eslint").Linter.FlatConfig[] } */
export const config = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }],
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
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'import/no-named-as-default': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-cycle': 'warn',
      'import/prefer-default-export': 'off',
      'import/order': [
        'error',
        {
          alphabetize: {
            caseInsensitive: true,
            order: 'asc',
          },
          groups: ['builtin', 'external', 'internal'],
          'newlines-between': 'always',
          pathGroups: [
            {
              group: 'builtin',
              pattern: 'react',
              position: 'before',
            },
            {
              group: 'builtin',
              pattern: 'aws*',
              position: 'before',
            },
            {
              group: 'builtin',
              pattern: '@dazn*',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'aws*', '@dazn*'],
        },
      ],
    },
  },
];
