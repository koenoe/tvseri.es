import { describe, expect, it } from 'vitest';

import {
  FEATURE_KINDS,
  fallThroughOrder,
  featureKindOfDay,
  isIfYouLikedDay,
  rotationIndex,
  TOY_KINDS,
  toyKindOfDay,
} from './rotation';

const days = (from: string, count: number) =>
  Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );

describe('home moments of the day', () => {
  it('match the known days', () => {
    // Mon 9 = Binge calculator + What's on; Tue 10 = Season in stills +
    // Where are they set? (signed in: If you liked X); Wed 11 = From the
    // archive + Connected by; Fri 13 = Binge calculator + Where are they set?;
    // Sat 14 = Season in stills + Connected by (signed in: If you liked X)
    expect(featureKindOfDay('2026-11-09')).toBe('binge');
    expect(toyKindOfDay('2026-11-09')).toBe('whats-on');
    expect(isIfYouLikedDay('2026-11-09')).toBe(false);
    expect(featureKindOfDay('2026-11-10')).toBe('stills');
    expect(toyKindOfDay('2026-11-10')).toBe('where-set');
    expect(isIfYouLikedDay('2026-11-10')).toBe(true);
    expect(featureKindOfDay('2026-11-11')).toBe('archive');
    expect(toyKindOfDay('2026-11-11')).toBe('connected-by');
    expect(isIfYouLikedDay('2026-11-11')).toBe(false);
    expect(featureKindOfDay('2026-11-13')).toBe('binge');
    expect(toyKindOfDay('2026-11-13')).toBe('where-set');
    expect(featureKindOfDay('2026-11-14')).toBe('stills');
    expect(toyKindOfDay('2026-11-14')).toBe('connected-by');
    expect(isIfYouLikedDay('2026-11-14')).toBe(true);
  });

  it("a fall-through tries the next kinds first and yesterday's last", () => {
    const yesterday = (day: string) =>
      new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000)
        .toISOString()
        .slice(0, 10);
    for (const day of days('2026-11-09', 60)) {
      const features = fallThroughOrder(FEATURE_KINDS, featureKindOfDay(day));
      expect(features[0]).toBe(featureKindOfDay(day));
      expect(features.at(-1)).toBe(featureKindOfDay(yesterday(day)));
      expect(new Set(features).size).toBe(FEATURE_KINDS.length);
      // the toys' walk shifts every four days: yesterday's toy is named
      const toys = fallThroughOrder(
        TOY_KINDS,
        toyKindOfDay(day),
        toyKindOfDay(yesterday(day)),
      );
      expect(toys[0]).toBe(toyKindOfDay(day));
      expect(toys.at(-1)).toBe(toyKindOfDay(yesterday(day)));
      expect(new Set(toys).size).toBe(TOY_KINDS.length);
    }
    expect(fallThroughOrder(FEATURE_KINDS, 'stills')).toEqual([
      'stills',
      'archive',
      'did-you-know',
      'binge',
    ]);
    expect(fallThroughOrder(TOY_KINDS, 'connected-by')).toEqual([
      'connected-by',
      'versus',
      'whats-on',
      'where-set',
    ]);
    // Fri 13 starts a block: Where are they set? after Thursday's Versus
    expect(fallThroughOrder(TOY_KINDS, 'where-set', 'versus')).toEqual([
      'where-set',
      'connected-by',
      'whats-on',
      'versus',
    ]);
  });

  it('walk each list in its order, one step a day', () => {
    const run = days('2026-11-09', 12);
    expect(run.map(featureKindOfDay)).toEqual([
      ...FEATURE_KINDS,
      ...FEATURE_KINDS,
      ...FEATURE_KINDS,
    ]);
    expect(run.slice(0, 4).map(toyKindOfDay)).toEqual([...TOY_KINDS]);
  });

  it('show every toy once in each four days, and every toy to a signed-in viewer within eight', () => {
    const run = days('2026-11-09', 32);
    for (let block = 0; block < run.length; block += 4) {
      expect(
        run
          .slice(block, block + 4)
          .map(toyKindOfDay)
          .sort(),
      ).toEqual([...TOY_KINDS].sort());
    }
    // signed in, If you liked X takes the odd days: the even days alone
    // still walk through every toy (a plain 4-day walk would never show a
    // signed-in viewer the toys on odd steps)
    for (let start = 0; start < run.length; start += 8) {
      const shared = run
        .slice(start, start + 8)
        .filter((day) => !isIfYouLikedDay(day))
        .map(toyKindOfDay);
      expect(shared.sort()).toEqual([...TOY_KINDS].sort());
    }
  });

  it('plans Versus on Thu 12 Nov (signed out) and Sun 15 Nov (everyone)', () => {
    expect(toyKindOfDay('2026-11-12')).toBe('versus');
    expect(toyKindOfDay('2026-11-15')).toBe('versus');
    expect(isIfYouLikedDay('2026-11-15')).toBe(false);
  });

  it('never repeat a kind two days running, also across New Year and before day 0', () => {
    for (const run of [days('2026-12-20', 30), days('2026-10-20', 30)]) {
      for (let i = 1; i < run.length; i++) {
        expect(featureKindOfDay(run[i]!)).not.toBe(
          featureKindOfDay(run[i - 1]!),
        );
        expect(toyKindOfDay(run[i]!)).not.toBe(toyKindOfDay(run[i - 1]!));
        expect(isIfYouLikedDay(run[i]!)).not.toBe(isIfYouLikedDay(run[i - 1]!));
      }
    }
  });
});

describe('rotationIndex', () => {
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
});
