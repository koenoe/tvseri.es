/**
 * An outside URL from upstream data (a TMDB homepage, a person's social
 * link) as a link target: only absolute http(s) URLs, else null (no
 * `javascript:`, `data:` or relative paths from someone else's data).
 */
export default function externalHref(
  value: string | null | undefined,
): string | null {
  if (!value || !URL.canParse(value)) {
    return null;
  }
  const { protocol } = new URL(value);
  return protocol === 'https:' || protocol === 'http:' ? value : null;
}
