import { describe, expect, it } from 'vitest';

import {
  FEATURE_KINDS,
  fallThroughOrder,
  featureKindOfDay,
  isIfYouLikedDay,
  TOY_KINDS,
  toyKindOfDay,
} from './rotation';

const days = (from: string, count: number) =>
  Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );

describe('home moments of the day (HMFinal moment rotation)', () => {
  it('match the board demo days', () => {
    // Mon 9 = Binge calculator + What's on; Tue 10 = Season in stills +
    // Where are they set? (signed in: If you liked X); Wed 11 = From the
    // archive + Connected by; Sat 14 = Connected by (signed in: If you liked X)
    expect(featureKindOfDay('2026-11-09')).toBe('binge');
    expect(toyKindOfDay('2026-11-09')).toBe('whats-on');
    expect(isIfYouLikedDay('2026-11-09')).toBe(false);
    expect(featureKindOfDay('2026-11-10')).toBe('stills');
    expect(toyKindOfDay('2026-11-10')).toBe('where-set');
    expect(isIfYouLikedDay('2026-11-10')).toBe(true);
    expect(featureKindOfDay('2026-11-11')).toBe('archive');
    expect(toyKindOfDay('2026-11-11')).toBe('connected-by');
    expect(isIfYouLikedDay('2026-11-11')).toBe(false);
    expect(featureKindOfDay('2026-11-14')).toBe('stills');
    expect(toyKindOfDay('2026-11-14')).toBe('connected-by');
    expect(isIfYouLikedDay('2026-11-14')).toBe(true);
  });

  it('Fri 13 and Sat 14: different pairs (binge + where-set, then stills + connected-by)', () => {
    expect([
      featureKindOfDay('2026-11-13'),
      toyKindOfDay('2026-11-13'),
    ]).toEqual(['binge', 'where-set']);
    expect([
      featureKindOfDay('2026-11-14'),
      toyKindOfDay('2026-11-14'),
    ]).toEqual(['stills', 'connected-by']);
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
    expect(TOY_KINDS).toContain('versus');
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
