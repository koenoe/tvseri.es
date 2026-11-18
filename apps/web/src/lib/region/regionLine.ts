/**
 * "Streaming in the United Kingdom" for `GB`. Self-contained
 * on purpose (no outer constants): the pre-paint region hint embeds its
 * source (`lib/region/regionHint`), so the line it draws before React and
 * the one React draws are the same text.
 */
export function regionLine(code: string): string {
  const upper = code.toUpperCase();
  // Names that take "the": a copy of `TAKES_THE` (`@tvseri.es/utils`), as
  // the pre-paint script embeds this function's source; the test pins them
  const takesThe =
    /^(?:U[KS]|United .+|(?:.+ )?(?:Islands|Republic|Territories|Netherlands)|Bahamas|Philippines|Gambia|Maldives|Seychelles|Comoros|Congo.*)$/;
  let name = upper;
  try {
    name = new Intl.DisplayNames('en', { type: 'region' }).of(upper) ?? upper;
  } catch {
    // a malformed code: the code itself
  }
  return `Streaming in ${takesThe.test(name) ? `the ${name}` : name}`;
}
