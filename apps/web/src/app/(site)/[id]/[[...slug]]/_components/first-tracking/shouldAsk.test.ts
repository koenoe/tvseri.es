import { describe, expect, it } from 'vitest';

import { promptDecision, shouldAskFirstTracking } from './shouldAsk';

const prefs = { firstTrackingAnsweredAt: null, neverAskBefore: false };
const fresh = { prefs, skipped: [], watched: {} };

describe('shouldAskFirstTracking', () => {
  it('asks a signed-in viewer who has tracked nothing and never answered', () => {
    expect(shouldAskFirstTracking(fresh, true)).toBe(true);
  });

  it('never asks signed out, before the seed, or without prefs', () => {
    expect(shouldAskFirstTracking(fresh, false)).toBe(false);
    expect(shouldAskFirstTracking(undefined, true)).toBe(false);
    expect(shouldAskFirstTracking({ ...fresh, prefs: null }, true)).toBe(false);
  });

  it('hides once answered or once anything is marked or skipped', () => {
    expect(
      shouldAskFirstTracking(
        { ...fresh, prefs: { ...prefs, firstTrackingAnsweredAt: 1 } },
        true,
      ),
    ).toBe(false);
    expect(
      shouldAskFirstTracking(
        { ...fresh, watched: { S01E01: { runtime: 28, watchedAt: 1 } } },
        true,
      ),
    ).toBe(false);
    expect(
      shouldAskFirstTracking({ ...fresh, skipped: ['S01E01'] }, true),
    ).toBe(false);
  });
});

describe('specials only', () => {
  it('still asks: the series itself is untracked, as the lists and the pre-paint hint say', () => {
    expect(
      shouldAskFirstTracking(
        { ...fresh, watched: { S00E01: { runtime: 60, watchedAt: 1 } } },
        true,
      ),
    ).toBe(true);
  });
});

describe('promptDecision', () => {
  it('keeps the shell’s choice signed out, while hydrating and before the seed', () => {
    expect(promptDecision(fresh, false)).toBe('unknown');
    expect(promptDecision(fresh, undefined)).toBe('unknown');
    expect(promptDecision(undefined, true)).toBe('unknown');
  });

  it('asks a fresh viewer, hides for an answer, a mark or unknown marks', () => {
    expect(promptDecision(fresh, true)).toBe('ask');
    expect(
      promptDecision(
        { ...fresh, prefs: { ...prefs, firstTrackingAnsweredAt: 1 } },
        true,
      ),
    ).toBe('hide');
    expect(promptDecision({ ...fresh, skipped: ['S01E01'] }, true)).toBe(
      'hide',
    );
    expect(promptDecision({ ...fresh, unavailable: true }, true)).toBe('hide');
    expect(promptDecision({ ...fresh, prefs: null }, true)).toBe('hide');
  });
});
