import { describe, expect, it } from 'vitest';

import {
  beforeTooLabel,
  codeRange,
  episodeCode,
  episodeLabel,
  episodeRun,
  markedMessage,
  runMessage,
  shortCode,
  shortCodeRange,
  unmarkedRunMessage,
} from './copy';

const ep = (seasonNumber: number, episodeNumber: number) => ({
  episodeNumber,
  seasonNumber,
});

describe('episode codes: one zero-padded format, in the page and in toasts', () => {
  it('writes episodes as "S03E05"', () => {
    expect(episodeCode(ep(3, 5))).toBe('S03E05');
    expect(episodeCode(ep(12, 105))).toBe('S12E105');
    expect(episodeLabel(ep(3, 5))).toBe('S03E05');
    expect(episodeLabel(ep(2, 3), 'Sundae')).toBe('S02E03 Sundae');
  });

  it('ranges within and across seasons', () => {
    expect(codeRange([ep(3, 2), ep(3, 5)])).toBe('S03E02–S03E05');
    expect(codeRange([ep(2, 9), ep(3, 2)])).toBe('S02E09–S03E02');
    expect(codeRange([ep(3, 5)])).toBe('S03E05');
    expect(codeRange([])).toBe('');
  });
});

describe('toast copy', () => {
  it('names episodes and runs with the same codes', () => {
    expect(markedMessage({ what: 'S03E05', when: 'Just now' })).toBe(
      'Marked S03E05 · Just now',
    );
    expect(runMessage([ep(3, 6), ep(3, 9)])).toBe(
      'Marked S03E06–S03E09 · Just now',
    );
    expect(runMessage([ep(2, 9), ep(3, 1)])).toBe(
      'Marked S02E09–S03E01 · Just now',
    );
    expect(unmarkedRunMessage([ep(3, 2), ep(3, 4)])).toBe(
      'Unmarked S03E02–S03E04',
    );
  });

  it('bulk marks say how many skipped they included', () => {
    expect(
      markedMessage({
        bulk: true,
        skipped: 1,
        unmarked: [ep(3, 7), ep(3, 8)],
        what: 'up to S03E05',
        when: 'Just now',
      }),
    ).toBe(
      'Marked up to S03E05 · Just now · incl. 1 skipped · unmarked S03E07–S03E08',
    );
    expect(beforeTooLabel(1)).toBe('Mark the one before too');
    expect(beforeTooLabel(3)).toBe('Mark the 3 before too');
  });
});

describe('short codes inside one season', () => {
  it('zero-pads the episode number: "E06", "E06–E09"', () => {
    expect(shortCode(6)).toBe('E06');
    expect(shortCodeRange(6, 6)).toBe('E06');
    expect(shortCodeRange(6, 9)).toBe('E06–E09');
  });
});

describe('episodeRun: a run of episodes in one line (the E repeats)', () => {
  it('one season: "S02E03–E05", lowest to highest whatever the order', () => {
    expect(episodeRun([ep(2, 5), ep(2, 3), ep(2, 4)])).toBe('S02E03–E05');
    expect(episodeRun([ep(1, 2), ep(1, 9)])).toBe('S01E02–E09');
  });

  it('across seasons: both full codes', () => {
    expect(episodeRun([ep(2, 3), ep(1, 4)])).toBe('S01E04–S02E03');
  });

  it('one episode, or the same one twice, is one code; none is empty', () => {
    expect(episodeRun([ep(3, 5)])).toBe('S03E05');
    expect(episodeRun([ep(3, 5), ep(3, 5)])).toBe('S03E05');
    expect(episodeRun([])).toBe('');
  });
});
