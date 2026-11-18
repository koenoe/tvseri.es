import { describe, expect, it } from 'vitest';

import { streamingServices } from './streamingServices';

// The UK services TMDB lists, plus the usual stores
const UK = [
  { id: 8, name: 'Netflix' },
  { id: 9, name: 'Amazon Prime Video' },
  { id: 350, name: 'Apple TV' },
  { id: 337, name: 'Disney Plus' },
  { id: 9999, name: 'JustWatch TV Free' },
  { id: 2, name: 'Apple TV Store' },
  { id: 35, name: 'Rakuten TV' },
  { id: 38, name: 'BBC iPlayer' },
  { id: 130, name: 'Sky Store' },
  { id: 10, name: 'Amazon Video' },
  { id: 3, name: 'Google Play Movies' },
  { id: 29, name: 'Sky Go' },
  { id: 41, name: 'ITVX' },
  { id: 4242, name: 'Some Store' },
];

describe('streamingServices', () => {
  it('keeps subscription and free services, in order', () => {
    expect(streamingServices(UK).map((provider) => provider.name)).toEqual([
      'Netflix',
      'Amazon Prime Video',
      'Apple TV',
      'Disney Plus',
      'BBC iPlayer',
      'Sky Go',
      'ITVX',
    ]);
  });
});
