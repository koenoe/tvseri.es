import { describe, expect, it } from 'vitest';

import { onTmdb, resetHttp } from './fakeHttp';
import { request } from './request';

const fakeTitles = (
  id: number,
  originalName: string,
  originCountry: string[],
  results: Array<{ iso_3166_1: string; title: string; type: string }>,
) =>
  onTmdb(`/tv/${id}`, {
    alternative_titles: { results },
    id,
    name: `Show ${id}`,
    origin_country: originCountry,
    original_name: originalName,
  });

describe('GET /series/romanized-titles', () => {
  it('returns a Latin-script title per show, null where there is none', async () => {
    fakeTitles(
      1,
      '葬送のフリーレン',
      ['JP'],
      [{ iso_3166_1: 'JP', title: 'Sousou no Frieren', type: 'Romaji' }],
    );
    fakeTitles(2, 'Dark', ['DE'], []);
    fakeTitles(3, '오징어 게임', ['KR'], []);

    const response = await request('/series/romanized-titles?ids=3,1,2,99');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('max-age=2629800');
    expect(await response.json()).toEqual({
      '1': 'Sousou no Frieren',
      '2': null,
      '3': null,
      '99': null,
    });
  });

  it('remembers the answers in the Cache table', async () => {
    fakeTitles(
      1,
      '蟲師',
      ['JP'],
      [{ iso_3166_1: 'JP', title: 'Mushishi', type: 'Romaji' }],
    );
    await request('/series/romanized-titles?ids=1');

    resetHttp();
    const response = await request('/series/romanized-titles?ids=1');

    expect(await response.json()).toEqual({ '1': 'Mushishi' });
  });

  it('rejects a missing, malformed or oversized id list', async () => {
    expect((await request('/series/romanized-titles')).status).toBe(400);
    expect((await request('/series/romanized-titles?ids=a,b')).status).toBe(
      400,
    );
    const many = Array.from({ length: 51 }, (_, i) => i + 1).join(',');
    expect((await request(`/series/romanized-titles?ids=${many}`)).status).toBe(
      400,
    );
  });
});
