import { describe, expect, it } from 'vitest';

import { pickRomanizedTitle } from './romanizedTitle';

const pick = (
  originalName: string,
  originCountry: string[],
  alternativeTitles: Array<{ iso_3166_1: string; title: string; type: string }>,
) => pickRomanizedTitle({ alternativeTitles, originalName, originCountry });

describe('pickRomanizedTitle', () => {
  it('has nothing to switch for a title already in Latin script', () => {
    expect(
      pick('Dark', ['DE'], [{ iso_3166_1: 'DE', title: 'Dark', type: '' }]),
    ).toBeNull();
    expect(pick('Les Revenants', ['FR'], [])).toBeNull();
  });

  it('prefers a title typed as romaji', () => {
    expect(
      pick(
        '葬送のフリーレン',
        ['JP'],
        [
          {
            iso_3166_1: 'US',
            title: "Frieren: Beyond Journey's End",
            type: '',
          },
          { iso_3166_1: 'JP', title: 'Sousou no Frieren', type: 'Romaji' },
          { iso_3166_1: 'JP', title: 'Frieren', type: '' },
        ],
      ),
    ).toBe('Sousou no Frieren');
  });

  it('falls back to a Latin title from the show’s own country', () => {
    expect(
      pick(
        '蟲師',
        ['JP'],
        [
          { iso_3166_1: 'US', title: 'Mushi-Shi', type: '' },
          { iso_3166_1: 'JP', title: 'Mushishi', type: '' },
        ],
      ),
    ).toBe('Mushishi');
  });

  it('ignores Latin titles from other countries and non-Latin titles', () => {
    expect(
      pick(
        '오징어 게임',
        ['KR'],
        [
          { iso_3166_1: 'US', title: 'Squid Game', type: '' },
          { iso_3166_1: 'KR', title: '오징어 게임', type: '' },
          { iso_3166_1: 'JP', title: 'イカゲーム', type: '' },
        ],
      ),
    ).toBeNull();
  });

  it('accepts macrons and other Latin diacritics', () => {
    expect(
      pick(
        '進撃の巨人',
        ['JP'],
        [{ iso_3166_1: 'JP', title: 'Shingeki no Kyōjin', type: 'Romaji' }],
      ),
    ).toBe('Shingeki no Kyōjin');
  });
});
