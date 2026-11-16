import { describe, expect, it } from 'vitest';

import { toRecordStub } from './recordStubText';

// Local times: the stub formats in the viewer's zone
const NOW = new Date(2026, 10, 12, 21, 40).getTime();
const at = (y: number, m: number, d: number, h = 20, min = 58) =>
  new Date(y, m - 1, d, h, min).getTime();

const base = {
  airDate: '2024-06-26',
  isNextUp: false,
  now: NOW,
  record: undefined,
  state: 'none' as const,
};

describe('toRecordStub (phone lines)', () => {
  const phone = (input: Partial<Parameters<typeof toRecordStub>[0]>) =>
    toRecordStub({ ...base, ...input }).phone.line;

  it('reads the watched date; drops the year this year; today and yesterday', () => {
    expect(
      phone({
        record: { runtime: 35, watchedAt: at(2025, 7, 2) },
        state: 'watched',
      }),
    ).toBe('Watched Jul 2, 2025');
    expect(
      phone({
        record: { runtime: 35, watchedAt: at(2026, 3, 4) },
        state: 'watched',
      }),
    ).toBe('Watched Mar 4');
    expect(
      phone({
        record: { runtime: 35, watchedAt: at(2026, 11, 12, 9, 5) },
        state: 'watched',
      }),
    ).toBe('Watched today');
    expect(
      phone({
        record: { runtime: 35, watchedAt: at(2026, 11, 11) },
        state: 'watched',
      }),
    ).toBe('Watched yesterday');
  });

  it('skipped, not watched, and an unseeded show drawn as not watched', () => {
    expect(phone({ state: 'skipped' })).toBe('Skipped');
    expect(phone({})).toBe('Not watched yet');
    expect(phone({ state: undefined })).toBe('Not watched yet');
  });

  it('the date action follows the record', () => {
    expect(toRecordStub(base).dateAction).toBe('Add a date');
    expect(toRecordStub({ ...base, state: 'skipped' }).dateAction).toBe(
      'Change date',
    );
    expect(toRecordStub({ ...base, isNextUp: true }).pressed).toBe(false);
  });
});

describe('toRecordStub (desktop air dates)', () => {
  it('reads the air date of an unwatched episode, future ones as "Airs"', () => {
    expect(toRecordStub(base).desktop.sub).toBe('Aired Jun 26, 2024');
    expect(toRecordStub({ ...base, airDate: '2027-01-08' }).desktop.sub).toBe(
      'Airs Jan 8, 2027',
    );
    expect(toRecordStub({ ...base, airDate: '' }).desktop.sub).toBeNull();
  });

  it('desktop dates this year without the year', () => {
    expect(
      toRecordStub({
        ...base,
        record: { runtime: 35, watchedAt: at(2026, 3, 4) },
        state: 'watched',
      }).desktop.line,
    ).toBe('Mar 4, 20:58');
  });
});

describe('toRecordStub per layout', () => {
  it('desktop draws the date and time, and never the source', () => {
    const stub = toRecordStub({
      ...base,
      record: { runtime: 35, source: 'Plex', watchedAt: at(2025, 7, 5, 22, 2) },
      state: 'watched',
    });
    expect(stub.desktop).toEqual({ line: 'Jul 5, 2025, 22:02', sub: null });
    expect(stub.phone).toEqual({ line: 'Watched Jul 5, 2025' });
  });

  it('desktop says "Today, 21:40" after a mark, with its provider', () => {
    const stub = toRecordStub({
      ...base,
      record: { runtime: 35, source: 'Disney+', watchedAt: NOW },
      state: 'watched',
    });
    expect(stub.desktop).toEqual({ line: 'Today, 21:40', sub: null });
    expect(stub.phone).toEqual({ line: 'Watched today' });
  });

  it('desktop "Don’t remember when"; unwatched shows Next up or the air date', () => {
    const undated = toRecordStub({
      ...base,
      record: { dateUnknown: true, runtime: 35, watchedAt: NOW },
      state: 'unknown',
    });
    expect(undated.desktop).toEqual({ line: 'Don’t remember when', sub: null });
    expect(undated.phone).toEqual({ line: 'Watched · don’t remember when' });
    expect(toRecordStub({ ...base, isNextUp: true }).desktop).toEqual({
      line: 'Not watched yet',
      sub: 'Next up',
    });
    expect(toRecordStub({ ...base, state: 'skipped' }).desktop).toEqual({
      line: 'Skipped',
      sub: 'Aired Jun 26, 2024',
    });
  });
});
