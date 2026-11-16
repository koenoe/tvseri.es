/**
 * "Streaming in the United Kingdom" for `GB`. Self-contained
 * on purpose (no outer constants): the pre-paint region hint embeds its
 * source (`lib/region/regionHint`), so the line it draws before React and
 * the one React draws are the same text.
 */
export function regionLine(code: string): string {
  const upper = code.toUpperCase();
  // Country names that take "the" in English (ISO 3166-1 alpha-2); one
  // string, as the pre-paint script embeds this function's source
  const withThe = ' AE BS CD CF CZ DO GB GM KY MV NL PH US VA ';
  let name = upper;
  try {
    name =
      new Intl.DisplayNames(['en'], { fallback: 'code', type: 'region' }).of(
        upper,
      ) ?? upper;
  } catch {
    name = upper;
  }
  return `Streaming in ${withThe.includes(` ${upper} `) ? `the ${name}` : name}`;
}
