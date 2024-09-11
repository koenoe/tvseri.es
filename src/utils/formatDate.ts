export default function formatDate(dateString: string): string {
  const date = new Date(dateString);

  const formatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  return `${month} ${day}, ${year}`;
}
