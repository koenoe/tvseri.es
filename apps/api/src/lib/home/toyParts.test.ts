import { describe, expect, it } from 'vitest';

import { channelIcon, channelMarks, placeShowOrder } from './toyParts';

const PROVIDERS = [
  { id: 8, logo: 'https://image.tmdb.org/t/p/w92/netflix.jpg' },
  { id: 350, logo: 'https://image.tmdb.org/t/p/w92/appletv.jpg' },
  { id: 15, logo: 'https://image.tmdb.org/t/p/w92/hulu.jpg' },
  { id: 2303, logo: 'https://image.tmdb.org/t/p/w92/paramount-premium.jpg' },
  { id: 9, logo: '' },
];

describe('channelIcon', () => {
  it('gives the watch provider icon for a channel drawn with one', () => {
    expect(channelIcon(213, PROVIDERS)).toBe(
      'https://image.tmdb.org/t/p/w92/netflix.jpg',
    );
  });

  it('gives every channel its square icon, Apple TV and Hulu too', () => {
    expect(channelIcon(2552, PROVIDERS)).toBe(
      'https://image.tmdb.org/t/p/w92/appletv.jpg',
    );
    expect(channelIcon(453, PROVIDERS)).toBe(
      'https://image.tmdb.org/t/p/w92/hulu.jpg',
    );
  });

  it('takes the first listed of a channel’s providers (Paramount+’s tiers)', () => {
    expect(channelIcon(4330, PROVIDERS)).toBe(
      'https://image.tmdb.org/t/p/w92/paramount-premium.jpg',
    );
  });

  it('gives nothing when TMDB lists no icon for the provider', () => {
    expect(channelIcon(1024, PROVIDERS)).toBeUndefined();
    expect(channelIcon(3186, PROVIDERS)).toBeUndefined();
    expect(channelIcon(213, [])).toBeUndefined();
  });
});

describe('channelMarks', () => {
  const WORDMARK = 'https://image.tmdb.org/t/p/w500/netflix-wordmark.png';

  it('an icon on the remote, the wordmark in the caption', () => {
    expect(channelMarks(213, PROVIDERS, WORDMARK)).toEqual({
      logo: 'https://image.tmdb.org/t/p/w92/netflix.jpg',
      logoKind: 'icon',
      wordmark: WORDMARK,
    });
  });

  it('no icon: the wordmark in both places', () => {
    expect(channelMarks(2552, [], WORDMARK)).toEqual({
      logo: WORDMARK,
      logoKind: 'wordmark',
      wordmark: WORDMARK,
    });
  });

  it('no wordmark: the caption writes the name', () => {
    expect(channelMarks(213, PROVIDERS, '').wordmark).toBe('');
    expect(channelMarks(2552, [], '')).toEqual({
      logo: '',
      logoKind: 'wordmark',
      wordmark: '',
    });
  });
});

describe('placeShowOrder', () => {
  it('puts the day pick first and keeps the rest in order', () => {
    expect(placeShowOrder([1, 2, 3], 1)).toEqual([2, 1, 3]);
    expect(placeShowOrder([1, 2, 3], 0)).toEqual([1, 2, 3]);
    expect(placeShowOrder([1, 2, 3], 2)).toEqual([3, 1, 2]);
  });

  it('keeps a single show and ignores an index out of range', () => {
    expect(placeShowOrder([7], 0)).toEqual([7]);
    expect(placeShowOrder([1, 2], 5)).toEqual([1, 2]);
  });
});
