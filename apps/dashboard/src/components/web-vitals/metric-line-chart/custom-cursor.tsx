// Custom cursor - just the white vertical line (dots handled by Line's activeDot)
// biome-ignore lint/suspicious/noExplicitAny: Recharts cursor props type
export function CustomCursor({ height, points, top }: any) {
  if (!points || points.length === 0) return null;

  const x = points[0].x;
  const chartTop = top ?? 0;
  const chartBottom = chartTop + (height ?? 300);

  return (
    <line
      stroke="white"
      strokeWidth={1}
      x1={x}
      x2={x}
      y1={chartTop}
      y2={chartBottom}
    />
  );
}

CustomCursor.displayName = 'CustomCursor';
