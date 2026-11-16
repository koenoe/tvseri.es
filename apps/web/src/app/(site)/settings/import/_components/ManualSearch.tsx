'use client';

import { type ChangeEvent, useDeferredValue, useEffect, useState } from 'react';

import Button from '@/components/ui/button/Button';
import { searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { createSearchClient } from '@/lib/search/fetchSearch';
import { searchKey } from '@/lib/search/searchKey';
import type { SearchShow } from '@/lib/search/searchView';

import OptionChip from './OptionChip';
import { SMALL_BUTTON } from './styles';

/** One client for the page: answers are kept per query, as in the overlay. */
const client = createSearchClient();

type Answer = Readonly<
  | { key: string; series: ReadonlyArray<SearchShow> }
  | { key: string; failed: true }
>;

/**
 * "Search manually" for a show TMDB didn't find by its name: the global search's `/api/search` results as chips, the
 * query editable. Picking one sends the rows again with that show.
 */
export default function ManualSearch({
  onPick,
  onSkip,
  query: initialQuery,
}: Readonly<{
  onPick: (show: SearchShow) => void;
  onSkip: () => void;
  query: string;
}>) {
  const [query, setQuery] = useState(initialQuery);
  const key = searchKey(useDeferredValue(query));
  const [answer, setAnswer] = useState<Answer | null>(() => {
    const cached = client.cached(searchKey(initialQuery));
    return cached
      ? { key: searchKey(initialQuery), series: cached.series }
      : null;
  });

  // Fetching follows the typed query (a subscription to the network, not derived state)
  useEffect(() => {
    if (!key) {
      return;
    }
    const cached = client.cached(key);
    if (cached) {
      setAnswer({ key, series: cached.series });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      client
        .fetchSearch(key, controller.signal)
        .then((view) => setAnswer({ key, series: view.series }))
        .catch(() => {
          if (!controller.signal.aborted) {
            setAnswer({ failed: true, key });
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    setQuery(event.target.value);
  const current = answer && answer.key === key ? answer : null;
  const series = current && 'series' in current ? current.series : null;

  return (
    <div className="flex flex-col gap-3 rounded-12 bg-black/22 px-4 py-3 text-meta leading-5 text-white/80 focus-within:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.45)]">
      <div className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="shrink-0" glyph={searchGlyph} size={13} />
          <span className="sr-only">Search for the series</span>
          <input
            className="h-8 min-w-0 flex-1 bg-transparent text-meta text-white outline-none placeholder:text-white/60 max-md:text-body"
            onChange={onChange}
            placeholder="Search for the series"
            type="search"
            value={query}
          />
        </label>
        <Button
          className={SMALL_BUTTON}
          onClick={onSkip}
          size="xs"
          variant="quiet"
        >
          <span className="text-body-sm">Skip it</span>
        </Button>
      </div>
      <SearchResults
        failed={current !== null && 'failed' in current}
        onPick={onPick}
        query={query}
        series={series}
      />
    </div>
  );
}

function SearchResults({
  failed,
  onPick,
  query,
  series,
}: Readonly<{
  failed: boolean;
  onPick: (show: SearchShow) => void;
  query: string;
  series: ReadonlyArray<SearchShow> | null;
}>) {
  if (failed) {
    return (
      <span aria-live="polite">
        Search isn’t answering. Try again in a moment.
      </span>
    );
  }
  if (series === null) {
    return <span aria-live="polite">Searching…</span>;
  }
  if (series.length === 0) {
    return (
      <span aria-live="polite">
        “{query.trim()}” · no series. tvseri.es tracks series, so films can’t
        come in.
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {series.map((show) => (
        <OptionChip key={show.id} onPick={onPick} value={show}>
          {show.releaseYear
            ? `${show.title} · ${show.releaseYear}`
            : show.title}
        </OptionChip>
      ))}
    </div>
  );
}
