/**
 * Sparkline path generation utilities.
 * Used to create SVG paths for mini charts in tables and cards.
 */

export const SPARKLINE_WIDTH = 48;
export const SPARKLINE_HEIGHT = 16;

/**
 * Generate a smooth (Catmull-Rom) sparkline path.
 * Best for latency/continuous metrics where smooth curves are preferred.
 */
export function getSmoothSparklinePath(
  points: ReadonlyArray<number>,
  width: number = SPARKLINE_WIDTH,
  height: number = SPARKLINE_HEIGHT,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M 0,${height / 2} L ${width},${height / 2}`;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const normalizedVal = (val - min) / range;
    const y = height - (normalizedVal * (height * 0.8) + height * 0.1);
    return [x, y] as const;
  });

  const firstPoint = coords[0];
  if (!firstPoint) return '';

  let d = `M ${firstPoint[0].toFixed(1)},${firstPoint[1].toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(i + 2, coords.length - 1)];

    if (!p0 || !p1 || !p2 || !p3) continue;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return d;
}

/**
 * Generate a sharp (linear) sparkline path.
 * Best for error rates and discrete data where exact values matter.
 */
export function getSharpSparklinePath(
  points: ReadonlyArray<number>,
  width: number = SPARKLINE_WIDTH,
  height: number = SPARKLINE_HEIGHT,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M 0,${height / 2} L ${width},${height / 2}`;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const normalizedVal = (val - min) / range;
    const y = height - (normalizedVal * (height * 0.8) + height * 0.1);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${coords.join(' L ')}`;
}

/**
 * Calculate Y position for a flat line (when there's no variation in data).
 */
export function getFlatLineY(
  value: number,
  maxValue: number,
  height: number = SPARKLINE_HEIGHT,
): number {
  const normalizedRate = Math.min(value, maxValue) / maxValue;
  return height - normalizedRate * height * 0.8 - height * 0.1;
}
