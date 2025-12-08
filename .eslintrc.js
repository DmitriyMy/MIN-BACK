const { readdirSync } = require('fs')

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    project: ['./tsconfig.eslint.json', './apps/*/tsconfig.app.json'],
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier', 'import', 'unused-imports', 'sonarjs', 'eslint-comments'],
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:eslint-comments/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:sonarjs/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: 'tsconfig.json',
      },
    },
  },
  overrides: [
    /**
     * typescript
     */

    {
      files: ['*.ts'],
      extends: [
        'plugin:@typescript-eslint/recommended-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
      ],
    },

    /**
     * javascript
     */

    {
      files: ['*.js'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },

    /**
     * disabling rules
     */

    {
      files: ['*.dto.ts', 'dto.ts'],
      rules: {
        'max-classes-per-file': 'off',
      },
    },
    {
      files: ['**/migration/**/*/*.ts', 'libs/types/**/*.ts'],
      rules: {
        'class-methods-use-this': 'off',
      },
    },
    {
      files: ['apps/gate/**/*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off', // FIXME enable rule
        '@typescript-eslint/explicit-module-boundary-types': 'off', // FIXME enable rule
      },
    },
  ],
  rules: {
    /**
     * config: airbnb-base
     */
    'no-empty-function': 'off', // disabled, because need to be able to use empty constructors
    'no-shadow': 'off', // disabled, because '@typescript-eslint/no-shadow' is enabled (better to work with typescript)
    'no-underscore-dangle': 'off', // disabled, because need to mark internal class' functions with underscore
    'no-useless-constructor': 'off', // disabled, because need to be able to use empty constructors
    'no-void': 'off', // disabled, because need to call async "bootstrap" apps' functions without "await" and a rejection handler
    /**
     * plugin: -
     */
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    /**
     * plugin: @typescript-eslint
     */
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/prefer-nullish-coalescing': [
      'error',
      { ignoreConditionalTests: true, ignoreMixedLogicalExpressions: true },
    ],
    /**
     * plugin: prettier
     */
    'prettier/prettier': 'error',
    /**
     * plugin: eslint-comments
     */
    'eslint-comments/no-unused-disable': 'error',
    /**
     * plugin: sonarjs
     */
    'sonarjs/cognitive-complexity': ['error', 10],
    /**
     * plugin: import
     */
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/no-default-export': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['**/*.js', '**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.d.ts'] },
    ],
    'import/no-unresolved': 'error',
    'import/no-restricted-paths': [
      'error',
      {
        zones: readdirSync(`${__dirname}/apps`).map((dirname) => ({
          target: `./apps/${dirname}`,
          from: './apps',
          except: [`./${dirname}`],
        })),
      },
    ],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['sibling', 'parent'], 'index', 'unknown'],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/prefer-default-export': 'off', // disabled, because 'named export' is used
    /**
     * plugin: unused-imports
     */
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
  },
}
