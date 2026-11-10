/** `formatPlural(1, 'season')` → "1 season", `formatPlural(2, 'season')` → "2 seasons" */
export default function formatPlural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}
