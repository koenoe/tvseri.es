import { describe, expect, it } from 'vitest';

import { formatSeriesYears } from './seriesYears';

describe('formatSeriesYears (one year format for a series everywhere)', () => {
  it('opens the range while a series runs ("2014–")', () => {
    for (const status of [
      'Returning Series',
      'In Production',
      'Planned',
      'Pilot',
    ]) {
      expect(
        formatSeriesYears({
          firstAirDate: '2014-01-12',
          lastAirDate: '2024-02-18',
          status,
        }),
      ).toBe('2014–');
    }
  });

  it('closes it once it ended, and is one year for one year', () => {
    expect(
      formatSeriesYears({
        firstAirDate: '2016-07-15',
        lastAirDate: '2025-12-31',
        status: 'Ended',
      }),
    ).toBe('2016–2025');
    expect(
      formatSeriesYears({
        firstAirDate: '2019-05-06',
        lastAirDate: '2019-06-03',
        status: 'Canceled',
      }),
    ).toBe('2019');
  });

  it('reads ISO timestamps as well as days, and says nothing when nothing is known', () => {
    expect(
      formatSeriesYears({
        firstAirDate: '1989-12-17T00:00:00.000Z',
        lastAirDate: '',
        status: 'Returning Series',
      }),
    ).toBe('1989–');
    expect(
      formatSeriesYears({ firstAirDate: '', lastAirDate: '', status: 'Ended' }),
    ).toBe('');
    expect(
      formatSeriesYears({
        firstAirDate: undefined,
        lastAirDate: '2003-01-01',
        status: 'Ended',
      }),
    ).toBe('2003');
  });

  it('treats an unknown status as ended', () => {
    expect(
      formatSeriesYears({
        firstAirDate: '2001-01-01',
        lastAirDate: '2004-01-01',
        status: undefined,
      }),
    ).toBe('2001–2004');
  });
});
