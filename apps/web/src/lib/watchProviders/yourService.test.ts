import { describe, expect, it } from 'vitest';

import { foldPlan, isChannel, yourService } from './yourService';

const provider = (id: number, name: string) => ({
  id,
  logo: '',
  logoPath: '',
  name,
});
const netflixAds = provider(1796, 'Netflix Standard with Ads');
const disney = provider(337, 'Disney Plus');
const hulu = provider(15, 'Hulu');
const channel = provider(2243, 'Apple TV Amazon Channel');

describe('yourService', () => {
  it('is the first of your services, in your order, that streams the show', () => {
    expect(yourService([hulu, disney], [disney, hulu])).toBe(disney);
    expect(yourService([disney, hulu], [hulu, disney])).toBe(hulu);
  });

  it('counts a plan with ads as the service itself', () => {
    expect(yourService([netflixAds], [{ id: 8, name: 'Netflix' }])).toBe(
      netflixAds,
    );
  });

  it('never counts a channel as yours', () => {
    expect(yourService([channel], [{ id: 2243, name: 'Apple TV' }])).toBeNull();
  });

  it('none of yours stream it: none', () => {
    expect(yourService([hulu], [disney])).toBeNull();
    expect(yourService([hulu], undefined)).toBeNull();
  });
});

describe('helpers', () => {
  it('folds plans and spots channels', () => {
    expect(foldPlan('Netflix Basic with Ads')).toBe('Netflix');
    expect(foldPlan('Disney+')).toBe('Disney+');
    expect(isChannel('Paramount+ Amazon Channel')).toBe(true);
    expect(isChannel('Channel 4')).toBe(false);
  });
});
