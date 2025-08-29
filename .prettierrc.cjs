/**
 * @type {import('prettier').Options}
 */
module.exports = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: true,
  plugins: [require.resolve('@ianvs/prettier-plugin-sort-imports')],
  importOrder: [
    '<BUILTIN_MODULES>',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@plasmohq/(.*)$',
    '',
    '^~(.*)$',
    '',
    '^[./]',
  ],
  overrides: [
    {
      files: [
        '*.css',
        '*.scss',
        '*.yml',
        'packages/extension/build/**/*',
        'packages/extension/scripts/**/*',
      ],
      options: {
        singleQuote: false,
      },
    },
    {
      files: 'packages/extension/src/messages/*.ts',
      options: {
        printWidth: 9999,
      },
    },
    { files: '*.json', options: { parser: 'json-stringify' } },
  ],
}
