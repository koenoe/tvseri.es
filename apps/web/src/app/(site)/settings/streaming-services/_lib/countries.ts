export type Country = Readonly<{ code: string; name: string }>;

/**
 * Codes `Intl.DisplayNames` knows but that are not countries to pick from:
 * regions (EU, UN), reserved and retired codes (ZZ, AN, YU…), and territories
 * without their own watch region.
 */
const NOT_COUNTRIES = new Set([
  'EU',
  'EZ',
  'UN',
  'QO',
  'XA',
  'XB',
  'ZZ',
  'AN',
  'BU',
  'CS',
  'DD',
  'FX',
  'NT',
  'SU',
  'TP',
  'YD',
  'YU',
  'ZR',
  'AC',
  'CP',
  'DG',
  'EA',
  'IC',
  'TA',
  'XK',
  'CQ',
]);

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Every country, AA–ZZ minus the non-countries, named by `nameOf`
 * (`regionName` from `@tvseri.es/utils`) and sorted by name. A code the runtime has no name
 * for (it answers the code itself, "Unknown Region" or nothing) is left out.
 */
export function listCountries(
  nameOf: (code: string) => string | undefined,
): ReadonlyArray<Country> {
  const countries: Country[] = [];
  for (const a of LETTERS) {
    for (const b of LETTERS) {
      const code = `${a}${b}`;
      if (NOT_COUNTRIES.has(code)) {
        continue;
      }
      let name: string | undefined;
      try {
        name = nameOf(code);
      } catch {
        name = undefined;
      }
      if (name && name !== code && !name.includes('Unknown')) {
        countries.push({ code, name });
      }
    }
  }
  return countries.sort((x, y) => x.name.localeCompare(y.name));
}

/** The filter: part of the name, or exactly the code. Empty keeps the list. */
export function filterCountries(
  countries: ReadonlyArray<Country>,
  query: string,
): ReadonlyArray<Country> {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return countries;
  }
  return countries.filter(
    ({ code, name }) =>
      name.toLowerCase().includes(needle) || code.toLowerCase() === needle,
  );
}
