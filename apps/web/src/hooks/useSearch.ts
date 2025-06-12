'use client';

import { useCallback, useEffect, useRef, useTransition } from 'react';

import { useDebouncedCallback } from 'use-debounce';

import { type TvSeries } from '@/types/tv-series';

import createUseRestorableState from './createUseRestorableState';

const useResults = createUseRestorableState<TvSeries[] | null>();

export function useSearch() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useResults('search', null);

  const handleSearch = useDebouncedCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      const signal = controller.signal;
      abortControllerRef.current = controller;

      const value = event.target.value;

      if (value) {
        startTransition(async () => {
          try {
            const response = await fetch(
              `/api/tv/search?q=${encodeURIComponent(value)}`,
              {
                signal,
              },
            );
            const json = (await response.json()) as TvSeries[];
            if (json) {
              setResults(json);
            } else {
              setResults([]);
            }
          } catch (_error) {}
        });
      } else {
        setResults(null);
      }
    },
    250,
  );

  const reset = useCallback(() => {
    setResults(null);
  }, [setResults]);

  useEffect(() => {
    return () => {
      handleSearch.flush();
      abortControllerRef.current?.abort();
    };
  }, [handleSearch]);

  return {
    results,
    isPending,
    handleSearch,
    reset,
  } as const;
}
