import { describe, expect, it } from 'vitest';

import { foldPlan, isChannel, pickWhere } from './pickWhere';

const provider = (id: number, name: string) => ({
  id,
  logo: `https://image.example.com/${id}.png`,
  logoPath: `/${id}.png`,
  name,
});

const disney = provider(337, 'Disney+');
const hulu = provider(15, 'Hulu');
const appleStore = provider(2, 'Apple TV Store');
const netflixAds = provider(1796, 'Netflix Standard with Ads');

describe('pickWhere', () => {
  it('says "On your …" for one of the viewer’s services, first match wins', () => {
    expect(pickWhere({ stream: [hulu, disney] }, [disney])).toEqual({
      kind: 'yours',
      logo: disney.logo,
      name: 'Disney+',
      text: 'On your Disney+',
    });
  });

  it('matches a service by name when the plan differs, and folds the plan', () => {
    expect(
      pickWhere({ stream: [netflixAds] }, [{ id: 8, name: 'Netflix' }])?.text,
    ).toBe('On your Netflix');
  });

  it('never counts a channel as yours', () => {
    const channel = provider(2243, 'Apple TV Amazon Channel');
    expect(
      pickWhere({ stream: [channel] }, [{ id: 2243, name: 'Apple TV' }]),
    ).toEqual({
      kind: 'stream',
      logo: channel.logo,
      name: 'Apple TV Amazon Channel',
      text: 'Apple TV Amazon Channel',
    });
  });

  it('else names the first stream, never "not on your services"', () => {
    expect(pickWhere({ stream: [hulu, disney] }, [])?.text).toBe('Hulu');
  });

  it('offers rent or buy only when nothing streams', () => {
    expect(pickWhere({ buy: [appleStore], stream: [disney] }, [])?.kind).toBe(
      'stream',
    );
    expect(pickWhere({ buy: [appleStore], stream: [] }, [])?.text).toBe(
      'Buy on Apple TV Store',
    );
    expect(
      pickWhere({ buy: [appleStore], rent: [hulu], stream: [] }, [])?.text,
    ).toBe('Rent on Hulu');
  });

  it('is null when there is nothing in the region', () => {
    expect(pickWhere({ stream: [] }, [disney])).toBeNull();
  });
});

describe('helpers', () => {
  it('folds ad plans and spots channels', () => {
    expect(foldPlan('Netflix Basic with Ads')).toBe('Netflix');
    expect(foldPlan('Disney+')).toBe('Disney+');
    expect(isChannel('Paramount+ Amazon Channel')).toBe(true);
    expect(isChannel('Channel 4')).toBe(false);
  });
});
