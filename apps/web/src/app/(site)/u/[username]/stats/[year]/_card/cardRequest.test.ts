import { describe, expect, it } from 'vitest';

import {
  cardCacheControl,
  cardFileName,
  cardPath,
  cardYearMessage,
  parseCardRequest,
} from './cardRequest';

const query = (value = '') => new URLSearchParams(value);

describe('parseCardRequest', () => {
  it('defaults to the dark square', () => {
    expect(parseCardRequest('2025', query())).toEqual({
      ok: true,
      request: { format: 'square', theme: 'dark', year: 2025 },
    });
  });

  it('reads the story and the colour theme', () => {
    expect(
      parseCardRequest('2025', query('format=story&theme=colour')),
    ).toEqual({
      ok: true,
      request: { format: 'story', theme: 'colour', year: 2025 },
    });
  });

  it('is a 400 for a size (the thumbnail is gone: no other variants)', () => {
    expect(parseCardRequest('2025', query('size=thumb'))).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it('treats an empty value as missing', () => {
    expect(parseCardRequest('2025', query('format=&theme='))).toMatchObject({
      request: { format: 'square', theme: 'dark' },
    });
  });

  it('is a 400 for an unknown value', () => {
    expect(parseCardRequest('2025', query('format=landscape'))).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(parseCardRequest('2025', query('theme=Colour'))).toMatchObject({
      status: 400,
    });
    expect(parseCardRequest('2025', query('size=large'))).toMatchObject({
      status: 400,
    });
  });

  it('is a 400 for any other query key', () => {
    expect(parseCardRequest('2025', query('x=1'))).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      parseCardRequest('2025', query('format=square&theme=dark&r=2')),
    ).toMatchObject({ status: 400 });
    expect(parseCardRequest('2025', query('Format=story'))).toMatchObject({
      status: 400,
    });
  });

  it('is a 400 for a repeated key, even with the same value', () => {
    expect(
      parseCardRequest('2025', query('format=story&format=square')),
    ).toMatchObject({ status: 400 });
    expect(
      parseCardRequest('2025', query('theme=dark&theme=dark')),
    ).toMatchObject({ status: 400 });
    expect(parseCardRequest('2025', query('size=&size='))).toMatchObject({
      status: 400,
    });
  });

  it('is a 404 for a year without a Stats page (the page’s rule)', () => {
    expect(parseCardRequest('25', query())).toMatchObject({ status: 404 });
    expect(parseCardRequest('1999', query())).toMatchObject({ status: 404 });
    expect(parseCardRequest('2999', query())).toMatchObject({ status: 404 });
    expect(parseCardRequest('2025.png', query())).toMatchObject({
      status: 404,
    });
  });

  it('checks the year before the query', () => {
    expect(parseCardRequest('1999', query('x=1'))).toMatchObject({
      status: 404,
    });
  });
});

describe('cardYearMessage', () => {
  it('has a card only for a finished year', () => {
    expect(cardYearMessage(2025, 'finished')).toBeNull();
    expect(cardYearMessage(2026, 'current')).toBe('No card for 2026 so far');
    expect(cardYearMessage(2027, 'future')).toBe('Not found');
  });
});

describe('cardPath', () => {
  it('points at the card route', () => {
    expect(cardPath('nina', 2025, { format: 'story', theme: 'colour' })).toBe(
      '/u/nina/stats/2025/card?format=story&theme=colour',
    );
  });
});

describe('cardFileName', () => {
  it('names the download by user, year and format, as a JPEG', () => {
    expect(cardFileName('nina', 2025, 'square', 'dark')).toBe(
      'nina-2025-square.jpg',
    );
    expect(cardFileName('nina', 2025, 'story', 'colour')).toBe(
      'nina-2025-story-colour.jpg',
    );
  });
});

describe('cardCacheControl', () => {
  it('lets the CDN keep a card a day, stale a day more, the browser an hour', () => {
    expect(cardCacheControl(false)).toBe(
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    );
  });

  it('keeps a card with a failed poster for the unavailable profile only', () => {
    expect(cardCacheControl(true)).toBe(
      'public, s-maxage=30, stale-while-revalidate=86400',
    );
  });
});
