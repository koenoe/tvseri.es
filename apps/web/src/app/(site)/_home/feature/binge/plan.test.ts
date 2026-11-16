import { describe, expect, it } from 'vitest';

import {
  BOARD_STRIP_WIDTH,
  episodeAt,
  legendLabel,
  nightsSummary,
  perNightLabel,
  planBinge,
  stripLabel,
} from './plan';

const DARK = [10, 8, 8];
const THE_WIRE = [13, 12, 12, 13, 10];
// Today: Wed 11 Nov 2026
const TODAY = '2026-11-11';

const plan = (overrides: Partial<Parameters<typeof planBinge>[0]> = {}) =>
  planBinge({
    mode: 'every',
    perNight: 2,
    seasons: DARK,
    today: TODAY,
    width: BOARD_STRIP_WIDTH,
    ...overrides,
  });

describe('episodeAt', () => {
  it('walks across seasons', () => {
    expect(episodeAt(DARK, 0)).toEqual({ episode: 1, season: 1 });
    expect(episodeAt(DARK, 9)).toEqual({ episode: 10, season: 1 });
    expect(episodeAt(DARK, 10)).toEqual({ episode: 1, season: 2 });
    expect(episodeAt(DARK, 25)).toEqual({ episode: 8, season: 3 });
  });
});

describe('formatters', () => {
  it('labels the switches, the summary and the legend', () => {
    expect(perNightLabel(1)).toBe('1 ep');
    expect(perNightLabel(3)).toBe('3 eps');
    expect(nightsSummary(2, 'every')).toBe('2 episodes a night');
    expect(nightsSummary(1, 'weeknights')).toBe(
      '1 episode a night, weeknights only',
    );
    expect(nightsSummary(4, 'weekends')).toBe(
      '4 episodes a night, weekends only',
    );
    expect(legendLabel(1)).toBe('A night of 1 episode');
  });
});

describe('planBinge', () => {
  it('draws the board: Dark in 13 nights, the last on Mon Nov 23', () => {
    const result = plan();
    expect(result.nights).toBe(13);
    expect(result.finish).toBe('Mon Nov 23');
    expect(result.oneLine).toBe(true);
    expect(result.cells).toHaveLength(13);
    expect(stripLabel(result)).toBe(
      '13 viewing nights, the last on Mon Nov 23',
    );
  });

  it('marks tonight and the last night, with their labels', () => {
    const { cells } = plan();
    expect(cells[0]).toEqual({
      day: '2026-11-11',
      dot: 'on',
      label: { align: 'start', strong: true, text: 'Tonight' },
      tip: 'Wed Nov 11: S01E01 to S01E02',
      tonight: true,
    });
    expect(cells[12]).toEqual({
      day: '2026-11-23',
      dot: 'finish',
      label: { align: 'end', strong: true, text: 'Mon Nov 23' },
      tip: 'Mon Nov 23: S03E07 to S03E08',
      tonight: false,
    });
    expect(cells.slice(1, 12).every((cell) => cell.label === null)).toBe(true);
  });

  it('runs a night across a season break', () => {
    expect(plan({ perNight: 3 }).cells[3]?.tip).toBe(
      'Sat Nov 14: S01E10 to S02E02',
    );
  });

  it('a last night with one episode has no range', () => {
    const { cells } = plan({ perNight: 4, seasons: [6, 6, 6, 6, 6, 6] });
    expect(cells.at(-1)?.tip).toBe('Thu Nov 19: S06E03 to S06E06');
    const odd = plan({ perNight: 4, seasons: [5] });
    expect(odd.cells.at(-1)?.tip).toBe('Thu Nov 12: S01E05');
  });

  it('skips weekends on weeknights only', () => {
    const result = plan({ mode: 'weeknights' });
    expect(result.nights).toBe(13);
    expect(result.finish).toBe('Fri Nov 27');
    expect(result.cells).toHaveLength(17);
    expect(result.cells[3]).toMatchObject({
      dot: 'off',
      tip: 'Sat Nov 14: off',
    });
    expect(result.cells.filter((cell) => cell.dot === 'off')).toHaveLength(4);
  });

  it('rings tonight even when tonight is a night off', () => {
    const { cells } = plan({ mode: 'weekends' });
    expect(cells[0]).toMatchObject({ dot: 'off', tonight: true });
  });

  it('labels a new month when there is room for it', () => {
    const { cells } = plan({ perNight: 1 });
    expect(cells).toHaveLength(26);
    expect(cells[20]?.label).toEqual({
      align: 'center',
      strong: false,
      text: 'Dec',
    });
  });

  it('drops a month label too close to the end', () => {
    const { cells } = plan({ perNight: 1, width: 300 });
    expect(cells.filter((cell) => cell.label)).toHaveLength(2);
  });

  it('wraps a long plan and names the year when it changes', () => {
    const result = plan({ mode: 'weekends', perNight: 1, seasons: THE_WIRE });
    expect(result.nights).toBe(60);
    expect(result.oneLine).toBe(false);
    expect(result.finish).toBe('Sun Jun 6, 2027');
    expect(
      result.cells.filter((cell) => cell.label?.text === 'Jan 2027'),
    ).toHaveLength(1);
  });

  it('finishes tonight when one night is enough', () => {
    const result = plan({ perNight: 4, seasons: [3] });
    expect(result.nights).toBe(1);
    expect(result.cells).toEqual([
      {
        day: '2026-11-11',
        dot: 'finish',
        label: { align: 'start', strong: true, text: 'Wed Nov 11' },
        tip: 'Wed Nov 11: S01E01 to S01E03',
        tonight: false,
      },
    ]);
  });
});
