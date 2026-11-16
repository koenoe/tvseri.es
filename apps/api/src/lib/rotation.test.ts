import { rotationIndex } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

const days = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) =>
    new Date(new Date(`${start}T00:00:00Z`).getTime() + i * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );

describe('rotationIndex', () => {
  it('gives the same index for the same day, count and salt', () => {
    expect(rotationIndex('2026-11-12', 4, 'feature')).toBe(
      rotationIndex('2026-11-12', 4, 'feature'),
    );
  });

  it('is always 0 for a single choice', () => {
    expect(rotationIndex('2026-11-12', 1, 'x')).toBe(0);
  });

  it('never repeats on consecutive days and visits every index each cycle', () => {
    const picks = days('2026-01-01', 400).map((d) =>
      rotationIndex(d, 4, 'feature'),
    );

    for (let i = 1; i < picks.length; i++) {
      expect(picks[i]).not.toBe(picks[i - 1]);
    }
    expect(new Set(picks.slice(0, 4))).toEqual(new Set([0, 1, 2, 3]));
  });

  it('differs between salts', () => {
    const a = days('2026-11-01', 14).map((d) => rotationIndex(d, 5, 'home'));
    const b = days('2026-11-01', 14).map((d) =>
      rotationIndex(d, 5, 'essentials'),
    );

    expect(a).not.toEqual(b);
  });

  it('pins a few literal days', () => {
    expect(
      days('2026-11-09', 4).map((d) => rotationIndex(d, 4, 'feature')),
    ).toEqual([1, 0, 3, 2]);
  });
});
