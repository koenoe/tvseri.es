// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';
import type { SeriesBase } from '@/lib/marking/types';

import ShowProvider from '../../_lib/ShowProvider';
import type { ShowSummary } from '../../_lib/show';
import EpisodesView from './EpisodesView';
import { record, season, view } from './testData';
import { STILL_SIZES } from './tileParts';

/** Every tile draws its still: the stills drawn are the tiles rendered. */
const renders = vi.hoisted(() => ({ stills: [] as string[] }));
vi.mock('./Still', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./Still')>();
  return {
    ...actual,
    default: (props: Parameters<typeof actual.default>[0]) => {
      renders.stills.push(props.sizes);
      return null;
    },
  };
});

const SEASON = season(1, 12);
const show: ShowSummary = {
  backdrop: '',
  id: 1,
  logo: '',
  nextEpisodeToAir: null,
  seasons: [
    {
      airDate: '2024-06-01',
      airedEpisodeCount: 12,
      episodeCount: 12,
      seasonNumber: 1,
      title: 'Season 1',
    },
  ],
  slug: 'show',
  status: 'Ended',
  title: 'Show',
};

// E01–E04 watched (one stack), E05 Next up, E06–E12 open
const before = view({
  seasons: [{ airedEpisodeCount: 12, episodeCount: 12, seasonNumber: 1 }],
  watched: {
    S01E01: record(1),
    S01E02: record(2),
    S01E03: record(3),
    S01E04: record(4),
  },
});

function Wall({ marks }: Readonly<{ marks: SeriesBase }>) {
  return (
    <MarkingProvider>
      <ShowProvider show={show}>
        <EpisodesView
          personal
          season={{ episodes: SEASON, seasonNumber: 1 }}
          seasonNumber={1}
          seriesId={1}
          view={marks}
        />
      </ShowProvider>
    </MarkingProvider>
  );
}

describe('the wall on a mark', () => {
  it('re-renders the tile marked and the Focus count, nothing else', () => {
    const { rerender } = render(<Wall marks={before} />);
    expect(renders.stills.length).toBeGreaterThan(0);
    renders.stills = [];
    // E09 watched: its tile leaves the open tiles for a compact one
    rerender(
      <Wall
        marks={{
          ...before,
          watched: { ...before.watched, S01E09: record(9) },
        }}
      />,
    );
    // Focus ("6 left in Season 1") and the compact tile E09 became: not the
    // open tiles, not the stack's three thumbs
    expect(renders.stills).toEqual([STILL_SIZES.focus, STILL_SIZES.thumb]);
  });
});
