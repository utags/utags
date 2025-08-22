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
      files: ['*.css', '*.scss', '*.yml', 'build/**/*', 'scripts/**/*'],
      options: {
        singleQuote: false,
      },
    },
    {
      files: 'src/messages/*.ts',
      options: {
        printWidth: 9999,
      },
    },
  ],
}
