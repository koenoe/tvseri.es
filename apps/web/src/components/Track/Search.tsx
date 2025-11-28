'use client';

import type { TvSeries } from '@tvseri.es/schemas';
import { useRouter } from 'next/navigation';
import { memo, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { useSearch } from '@/hooks/useSearch';

import SearchInput from '../Search/SearchInput';
import SearchResults from '../Search/SearchResults';

function TrackSearch() {
  const { results, isPending, handleSearch, reset } = useSearch();
  const router = useRouter();

  const itemHref = useCallback(
    (series: TvSeries) => `/track/${series.id}/${series.slug}`,
    [],
  );

  const handleKeyDown = useDebouncedCallback((event: React.KeyboardEvent) => {
    if (!isPending && event.key === 'Enter') {
      const firstResult = results?.[0];
      if (firstResult) {
        router.push(`/track/${firstResult.id}/${firstResult.slug}`);
      }
    }
  }, 100);

  return (
    <div className="flex flex-col gap-10">
      <SearchInput
        alwaysShowCloseButton={false}
        className="rounded-3xl bg-white/5"
        color="white"
        onChange={handleSearch}
        onClose={reset}
        onKeyDown={handleKeyDown}
      />
      <SearchResults
        className="grid grid-cols-2 gap-6 text-neutral-500 md:grid-cols-4 xl:grid-cols-8"
        isPending={isPending}
        itemHref={itemHref}
        mode="dark"
        results={results}
      />
    </div>
  );
}

export default memo(TrackSearch);
