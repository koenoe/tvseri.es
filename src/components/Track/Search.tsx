'use client';

import { memo, useCallback } from 'react';

import { useSearch } from '@/hooks/useSearch';
import { type TvSeries } from '@/types/tv-series';

import SearchInput from '../Search/SearchInput';
import SearchResults from '../Search/SearchResults';

function TrackSearch() {
  const { results, isPending, handleSearch, reset } = useSearch();

  const itemHref = useCallback((series: TvSeries) => `/track/${series.id}`, []);

  return (
    <div className="flex flex-col gap-10">
      <SearchInput
        className="rounded-3xl bg-white/5"
        color="white"
        onChange={handleSearch}
        onClose={reset}
      />
      <SearchResults
        className="grid grid-cols-2 gap-6 text-neutral-500 md:grid-cols-4 xl:grid-cols-8"
        isPending={isPending}
        results={results}
        itemHref={itemHref}
        mode="dark"
      />
    </div>
  );
}

export default memo(TrackSearch);
