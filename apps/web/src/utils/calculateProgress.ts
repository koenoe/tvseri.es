export default function calculateProgress(
  value: number,
  total: number,
): number {
  const raw = (value / total) * 100;
  const rounded = Math.floor(raw);
  const clamped = Math.max(
    0,
    Math.min(rounded === 0 && raw > 0 ? 1 : rounded, 100),
  );
  return clamped;
}
