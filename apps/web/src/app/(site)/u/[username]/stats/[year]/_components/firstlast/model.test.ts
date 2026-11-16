import { describe, expect, it } from 'vitest';

import { spotlightCard } from './model';

describe('spotlightCard', () => {
  const item = {
    episode: {
      episodeNumber: 1,
      runtime: 59,
      seasonNumber: 1,
      stillImage: null,
      title: 'Episode 1',
    },
    tvSeries: {
      backdropColor: null,
      backdropImage: 'backdrop.jpg',
      id: 7,
      posterImage: null,
      slug: 'the-traitors',
      title: 'The Traitors',
      titleTreatmentImage: 'logo.png',
    },
    watchedAt: Date.UTC(2025, 0, 4, 21, 30),
    watchProviderLogo: null,
  };

  it('writes the card', () => {
    expect(spotlightCard(item)).toEqual({
      backdrop: 'backdrop.jpg',
      code: 'S01E01',
      date: 'Sat Jan 4',
      duration: '59m',
      episodeTitle: 'Episode 1',
      href: '/7/the-traitors',
      label: 'The Traitors S01E01',
      logo: 'logo.png',
      title: 'The Traitors',
    });
  });

  it('leaves the duration out when the runtime is unknown', () => {
    expect(
      spotlightCard({ ...item, episode: { ...item.episode, runtime: 0 } })
        .duration,
    ).toBeNull();
  });
});
