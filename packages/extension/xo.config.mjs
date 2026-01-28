/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    ignores: ['**/*.user.js', 'src/global.d.ts', 'build/**/*'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    space: 2,
    prettier: 'compat',
    languageOptions: {
      globals: {
        document: 'readonly',
      },
    },
    rules: {
      'no-alert': 0,
      'import-x/extensions': 0,
      'n/file-extension-in-import': 0,
      // 'n/prefer-global/process': 0,
      'n/prefer-global/buffer': 0,
      'import-x/order': 0,
      '@typescript-eslint/unified-signatures': 0,
      '@typescript-eslint/prefer-nullish-coalescing': 0,
      '@typescript-eslint/prefer-optional-chain': 0,
      '@typescript-eslint/consistent-type-assertions': 0,
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'objectLiteralProperty',
          format: null,
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
      ],
      'new-cap': 0,
      'logical-assignment-operators': 0,
      'prefer-destructuring': 0,
      'unicorn/prefer-spread': 0,
      'prefer-object-spread': 0,
      'unicorn/prefer-at': 0,
      'unicorn/prevent-abbreviations': 0,
      'unicorn/prefer-string-raw': 0,
      'unicorn/prefer-dom-node-dataset': 0,
      'capitalized-comments': 0,
      '@stylistic/indent': 0,
      '@stylistic/indent-binary-ops': 0,
      'prefer-object-has-own': 0,
      'unicorn/prefer-top-level-await': 0,
      // 'no-await-in-loop': 0,
      // temp
      '@typescript-eslint/no-unsafe-assignment': 0,
      '@typescript-eslint/no-unsafe-call': 0,
      // '@typescript-eslint/no-unsafe-return': 0,
      // '@typescript-eslint/no-unsafe-argument': 0,
      '@typescript-eslint/restrict-plus-operands': 0,
    },
  },
  {
    files: ['postcss.config.js', 'postcss.config.cjs'],
    rules: {
      'unicorn/prefer-module': 0,
      '@stylistic/indent-binary-ops': 0,
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@stylistic/indent': 0,
      '@stylistic/indent-binary-ops': 0,
    },
  },
  {
    files: ['src/messages/*.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 0,
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 0,
    },
  },
  {
    files: ['src/sites/**/*.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 0,
      'n/file-extension-in-import': 0,
      // FIXME
      'arrow-body-style': 0,
    },
  },
]

export default xoConfig
