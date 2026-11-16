import { describe, expect, it } from 'vitest';

import { archiveStanding } from './archive';

const item = (id: number, year: number) => ({
  firstAirDate: `${year}-06-02`,
  id,
});

// best first: Breaking Bad, Planet Earth II, Planet Earth, Band of Brothers…
const TOP = [
  item(1, 2008),
  item(2, 2016),
  item(3, 2006),
  item(4, 2001),
  item(5, 2002),
  item(6, 2010),
  item(7, 1999),
  item(8, 2019),
  item(9, 2011),
  item(10, 2013),
  item(11, 1997),
  item(12, 2015),
];

describe('archiveStanding', () => {
  it('rounds the rank up to Top 5 and says when nothing in it is older', () => {
    expect(archiveStanding(item(4, 2001), TOP)).toEqual({
      oldest: true,
      rank: 4,
      top: 5,
    });
  });

  it('is not the oldest when an older show shares the bucket', () => {
    expect(archiveStanding(item(5, 2002), TOP)).toEqual({
      oldest: false,
      rank: 5,
      top: 5,
    });
  });

  it('uses the next bucket for ranks 6 to 10 and 11 to 20', () => {
    expect(archiveStanding(item(7, 1999), TOP)).toEqual({
      oldest: true,
      rank: 7,
      top: 10,
    });
    expect(archiveStanding(item(12, 2015), TOP)).toEqual({
      oldest: false,
      rank: 12,
      top: 20,
    });
  });

  it('is null when the show is not in the list', () => {
    expect(archiveStanding(item(99, 1990), TOP)).toBeNull();
  });

  it('is null below the last bucket', () => {
    const long = Array.from({ length: 25 }, (_, i) => item(i + 1, 2000 + i));
    expect(archiveStanding(item(21, 2020), long)).toBeNull();
  });
});
