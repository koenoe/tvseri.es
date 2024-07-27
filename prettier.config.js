/** @type {import("prettier").Options} */
const config = {
  endOfLine: 'auto',
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: '.editorconfig',
      options: { parser: 'yaml' },
    },
    {
      files: 'LICENSE',
      options: { parser: 'markdown' },
    },
  ],
  plugins: ['prettier-plugin-tailwindcss'],
};

module.exports = config;
