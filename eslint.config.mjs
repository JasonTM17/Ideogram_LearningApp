import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import importBoundariesPlugin from './scripts/eslint/import-boundaries-plugin.mjs';

export default tseslint.config(
  {
    ignores: [
      '**/.expo/**',
      '**/.next/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/web-build/**',
      'assets/designs/stitch/exports/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: [
      'apps/worker/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}',
      'scripts/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}',
      'commitlint.config.cjs',
      'eslint.config.mjs',
      'prettier.config.mjs',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['apps/mobile/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    plugins: {
      ideogram: importBoundariesPlugin,
    },
    rules: {
      'ideogram/import-boundaries': ['error', { target: 'mobile' }],
    },
  },
  {
    files: ['apps/web/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    plugins: {
      ideogram: importBoundariesPlugin,
    },
    rules: {
      'ideogram/import-boundaries': ['error', { target: 'web-client' }],
    },
  },
  {
    files: ['packages/*/src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    plugins: {
      ideogram: importBoundariesPlugin,
    },
    rules: {
      'ideogram/import-boundaries': ['error', { target: 'shared' }],
    },
  },
);
