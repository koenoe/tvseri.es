const CELL_NEEDS_QUOTES = /[",\r\n]/;
// Spreadsheets run cells that start with these as formulas (OWASP CSV
// injection); the web importer takes the apostrophe off again
const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV cell, escaped as RFC 4180 asks (and defused for spreadsheets) */
export const csvCell = (value: string | number | null | undefined) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) {
    text = `'${text}`;
  }
  return CELL_NEEDS_QUOTES.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
};

export const toCsv = (
  header: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
) =>
  `${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
