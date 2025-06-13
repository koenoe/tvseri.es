export default function calculateProgress(
  value: number,
  total: number,
): number {
  const raw = (value / total) * 100;
  if (value === total) {
    return 100;
  }
  const rounded = Math.floor(raw);
  return rounded === 0 && raw > 0 ? 1 : rounded;
}
