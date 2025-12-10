export default function formatDate(
  input: string | number,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = new Date(input);
  const formatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  return year ? `${month} ${day}, ${year}` : `${month} ${day}`;
}
