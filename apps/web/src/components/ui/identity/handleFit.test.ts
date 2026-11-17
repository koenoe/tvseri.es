import { describe, expect, it } from 'vitest';

import { handleEm, handleFontSize } from './handleFit';

/** The font size the sidebar's 300px column gives a handle, 20 to 48px */
const sizeIn300 = (username: string) =>
  Math.min(48, Math.max(20, 298 / handleEm(username)));

/**
 * The widest handle `generateUsername` can make (its widest adjective and
 * noun, three wide digits): 25 characters
 */
const WIDEST_GENERATED = 'honorable-hummingbird-000';

/** A 390px phone's compact identity: the page's 16px sides, 12px gap, the Following pill (~105px) */
const COMPACT_AT_390 = 390 - 32 - 12 - 105;

describe('handleEm', () => {
  it('keeps short handles at 48px, as the column allows (@ryanllester, @dmbhaggis)', () => {
    expect(sizeIn300('ryanllester')).toBe(48);
    expect(sizeIn300('dmbhaggis')).toBe(48);
  });

  it('shrinks a handle full of wide letters further than an average one', () => {
    expect(handleEm('mmmmmmmmmm')).toBeGreaterThan(handleEm('llllllllll'));
    expect(sizeIn300('marathonwatcher')).toBeLessThan(48);
  });

  it('fits every generated handle on one line: 20px in the sidebar, 16px beside the phone’s pill', () => {
    expect(handleEm(WIDEST_GENERATED) * 20).toBeLessThanOrEqual(298);
    expect(handleEm('parallel-chipmunk-698') * 26).toBeGreaterThan(298);
    expect(handleEm(WIDEST_GENERATED, 0.75) * 16).toBeLessThanOrEqual(
      COMPACT_AT_390 - 2,
    );
  });

  it('builds the fitted size for the container', () => {
    expect(handleFontSize('alex', { max: 48, min: 20 })).toBe(
      `clamp(20px, calc((100cqw - 2px) / ${handleEm('alex')}), 48px)`,
    );
  });

  it('treats a character outside the username alphabet as the widest', () => {
    expect(handleEm('é')).toBe(handleEm('m'));
  });
});
