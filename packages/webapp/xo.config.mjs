/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    ignores: ['**/*.user.js', '**/*.svelte', 'src/global.d.ts', 'build/**/*'],
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
      'no-undef': 0,
      // 'no-alert': 0,
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
      'new-cap': [
        'error',
        {
          capIsNewExceptionPattern: '^m\\.\\w+',
        },
      ],
      'logical-assignment-operators': 0,
      'prefer-destructuring': 0,
      'unicorn/prefer-spread': 0,
      'prefer-object-spread': 0,
      'unicorn/prefer-at': 0,
      'unicorn/prevent-abbreviations': 0,
      'unicorn/prefer-string-raw': 0,
      'capitalized-comments': 0,
      '@stylistic/indent': 0,
      '@stylistic/indent-binary-ops': 0,
      'prefer-object-has-own': 0,
      'unicorn/prefer-top-level-await': 0,
      // 'arrow-body-style': 0,
      // 'no-await-in-loop': 0,
      // temp
      '@typescript-eslint/no-deprecated': 0,
      '@typescript-eslint/member-ordering': 0,
      'promise/prefer-await-to-then': 0,
      '@typescript-eslint/no-unsafe-assignment': 0,
      '@typescript-eslint/no-unsafe-call': 0,
      '@typescript-eslint/no-unsafe-return': 0,
      '@typescript-eslint/no-unsafe-argument': 0,
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
    files: ['src/data/*'],
    rules: {
      '@typescript-eslint/naming-convention': 0,
      'unicorn/filename-case': 0,
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 0,
      '@typescript-eslint/consistent-type-assertions': 0,
      '@typescript-eslint/no-unsafe-assignment': 0,
      '@typescript-eslint/no-unsafe-call': 0,
      '@typescript-eslint/no-unsafe-return': 0,
      '@typescript-eslint/no-unsafe-argument': 0,
      'max-params': 0,
    },
  },
  {
    files: ['src/sw.js'],
    rules: {
      'unicorn/prefer-global-this': 0,
      'array-callback-return': 0,
    },
  },
  {
    files: ['**/*.user.js'],
    rules: {
      'unicorn/prefer-module': 0,
      camelcase: 0,
      'new-cap': 0,
    },
  },
  {
    files: ['src/vite-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 0,
    },
  },
  {
    files: ['vite.config.ts'],
    rules: {
      'import/no-anonymous-default-export': 0,
      '@typescript-eslint/naming-convention': 0,
      '@typescript-eslint/no-unsafe-call': 0,
      'new-cap': 0,
    },
  },
]

export default xoConfig
