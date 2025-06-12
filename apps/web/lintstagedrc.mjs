import path from 'path';

const buildEslintCommand = (filenames) =>
  `next lint --fix --dir . --file ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(' --file ')}`;

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  '*.{js,jsx,ts,tsx}': [buildEslintCommand],
};
