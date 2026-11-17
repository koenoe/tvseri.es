import { describe, expect, it } from 'vitest';

import {
  EPISODE_SK,
  episodeIndexSk,
  episodeSk,
  historyIndexPk,
  seasonIndexPrefix,
  seriesIndexPk,
  seriesSkPrefix,
  seriesSkRange,
  WATCHED_SK_PREFIX,
  watchedPk,
} from './keys';

// Stored items keep the format they were written with: these strings must
// never change
describe('Watched table keys', () => {
  it('builds the base-table keys', () => {
    expect(watchedPk('01JUSER')).toBe('USER#01JUSER');
    expect(WATCHED_SK_PREFIX).toBe('SERIES#');
    expect(seriesSkPrefix(1396)).toBe('SERIES#1396#');
    expect(episodeSk(1396, 1, 7)).toBe('SERIES#1396#S001#E007');
    expect(episodeSk('1396', 0, 1)).toBe('SERIES#1396#S000#E001');
    expect(episodeSk(1396, 12, 1234)).toBe('SERIES#1396#S012#E1234');
  });

  it('builds the per-show ranges, specials in or out', () => {
    expect(seriesSkRange(1396, 1)).toEqual({
      from: 'SERIES#1396#S001',
      to: 'SERIES#1396#S999#E999',
    });
    expect(seriesSkRange(1396, 0)).toEqual({
      from: 'SERIES#1396#S000',
      to: 'SERIES#1396#S999#E999',
    });
  });

  it('builds the gsi1 and gsi2 keys', () => {
    expect(seriesIndexPk('01JUSER', 1396)).toBe('USER#01JUSER#SERIES#1396');
    expect(episodeIndexSk(1, 7)).toBe('S001#E007');
    expect(episodeIndexSk(0, 1234)).toBe('S000#E1234');
    expect(seasonIndexPrefix(1)).toBe('S001#');
    expect(seasonIndexPrefix(100)).toBe('S100#');
    expect(historyIndexPk('01JUSER')).toBe('USER#01JUSER#WATCHED');
  });

  it('parses the series and season of an episode sort key', () => {
    expect(EPISODE_SK.exec('SERIES#1396#S002#E1234')?.slice(1)).toEqual([
      '1396',
      '002',
      '1234',
    ]);
    expect(EPISODE_SK.exec('LIST#WATCHED#ITEM#1')).toBeNull();
  });

  // A show's prefix and BETWEEN range must never reach another show's episodes
  it('keeps one show apart from shows whose id starts the same', () => {
    const show13 = episodeSk(13, 1, 1);
    expect(show13.startsWith(seriesSkPrefix(1))).toBe(false);
    const { from, to } = seriesSkRange(1, 1);
    expect(show13 > from && show13 < to).toBe(false);
  });

  it('sorts episodes in season order, so a range from season 1 leaves the specials out', () => {
    const { from, to } = seriesSkRange(1396, 1);
    const inRange = (sk: string) => sk >= from && sk <= to;
    expect(inRange(episodeSk(1396, 0, 1))).toBe(false);
    expect(inRange(episodeSk(1396, 1, 1))).toBe(true);
    expect(inRange(episodeSk(1396, 12, 1234))).toBe(true);
    expect(episodeSk(1396, 2, 1) < episodeSk(1396, 10, 1)).toBe(true);
    expect(episodeIndexSk(1, 9) < episodeIndexSk(1, 10)).toBe(true);
    expect(episodeIndexSk(100, 1).startsWith(seasonIndexPrefix(1))).toBe(false);
  });
});
