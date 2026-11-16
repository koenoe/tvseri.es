import { readFileSync } from 'node:fs';
import path from 'node:path';

import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';

import {
  searchCatalogue,
  specById,
  toSeason,
  toSeries,
} from '../../../../../../e2e/stub-api/fixtures/settings-import/catalog.ts';
import { detectSource } from './columns';
import { createEpisodeMatcher } from './matcher';
import { prepareRows } from './prepareRows';

/**
 * The sample Netflix file (e2e/fixtures) against the stub catalogue: what the
 * UI and the e2e specs rely on.
 */
const file = readFileSync(
  path.join(
    import.meta.dirname,
    '../../../../../../e2e/fixtures/NetflixViewingHistory.sample.csv',
  ),
  'utf8',
);
const NOW = new Date(2026, 10, 12, 21, 40).getTime();

const parsed = Papa.parse<Record<string, unknown>>(file, {
  dynamicTyping: true,
  header: true,
  skipEmptyLines: true,
});

describe('NetflixViewingHistory.sample.csv', () => {
  it('is recognised as a Netflix file', () => {
    const source = detectSource(parsed.meta.fields ?? []);
    expect(source).toMatchObject({ kind: 'netflix', recognised: true });
  });

  const source = detectSource(parsed.meta.fields ?? []);
  const prepared = prepareRows(parsed.data, source.mapping, { now: NOW });

  it('prepares the rows: a film, a repeat and a future date are not rows', () => {
    expect(parsed.data).toHaveLength(16);
    expect(prepared.skipped).toEqual({ films: 1, repeats: 1 });
    expect(prepared.dateProblems).toEqual([
      {
        reason: 'future',
        row: {
          episode: 'Woe What a Night',
          season: 'Season 2',
          title: 'Wednesday',
        },
      },
    ]);
    expect(prepared.importable).toBe(13);
    expect(prepared.hasAssumedDates).toBe(true);
  });

  it('matches against the stub catalogue: ambiguous, recap and film are problems', async () => {
    const matcher = createEpisodeMatcher({
      getSeason: async (id, n) => {
        const spec = specById(id);
        return spec ? toSeason(spec, n) : null;
      },
      getTvSeries: async (id) => {
        const spec = specById(id);
        return spec ? toSeries(spec) : null;
      },
      searchTvSeries: async (title) => searchCatalogue(title),
    });
    const outcomes = await Promise.all(
      prepared.rows.map((row) => matcher.match(row)),
    );
    const kinds = outcomes.map((o) =>
      o.kind === 'matched' ? 'matched' : o.problem.kind,
    );
    const count = (kind: string) => kinds.filter((k) => k === kind).length;
    expect(count('matched')).toBe(9);
    expect(count('ambiguous')).toBe(2);
    expect(count('episode-not-found')).toBe(1);
    expect(count('series-not-found')).toBe(1);
    expect(
      outcomes.some((o) => o.kind === 'matched' && o.seasonNumber === 0),
    ).toBe(true);
  });
});
