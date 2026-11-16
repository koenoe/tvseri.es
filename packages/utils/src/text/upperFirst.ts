/**
 * The first letter upper-cased, the rest as written: how a TMDB keyword
 * ("post-apocalyptic future") reads as a title ("Post-apocalyptic future").
 */
export const upperFirst = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);
