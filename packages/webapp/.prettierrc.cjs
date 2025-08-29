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
  plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
  overrides: [
    { files: '*.svelte', options: { parser: 'svelte' } },
    { files: '*.html', options: { printWidth: 200 } },
    { files: '*.json', options: { parser: 'json-stringify' } },
  ],
}
