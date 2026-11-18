import { describe, expect, it } from 'vitest';

import { sortApiRows } from './queries';

const row = (
  name: string,
  requestCount: number,
  errorRate: number,
  p75: number,
  p99: number,
  apdex?: number,
) => ({
  ...(apdex !== undefined && { apdex: { score: apdex } }),
  errorRate,
  latency: { p75, p99 },
  name,
  requestCount,
});

const names = (rows: ReadonlyArray<Readonly<{ name: string }>>) =>
  rows.map((item) => item.name);

describe('sortApiRows', () => {
  const rows = () => [
    row('a', 10, 0.5, 300, 900, 0.7),
    row('b', 30, 0.1, 100, 1200, 0.9),
    row('c', 20, 0.3, 200, 600, 0.8),
  ];

  it.each([
    ['requests', ['b', 'c', 'a']],
    ['errorRate', ['a', 'c', 'b']],
    ['p75', ['a', 'c', 'b']],
    ['p99', ['b', 'a', 'c']],
    ['apdex', ['b', 'c', 'a']],
  ] as const)('sorts by %s, highest first by default', (sortBy, expected) => {
    expect(names(sortApiRows(rows(), sortBy, 'desc'))).toEqual(expected);
  });

  it('sorts lowest first with asc', () => {
    expect(names(sortApiRows(rows(), 'requests', 'asc'))).toEqual([
      'a',
      'c',
      'b',
    ]);
  });
});
