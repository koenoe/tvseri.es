export default function toQueryString(
  query: Record<string, string | number | boolean>,
) {
  return `?${Object.entries(query)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&')}`;
}
