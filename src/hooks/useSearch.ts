'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { useDebouncedCallback } from 'use-debounce';

import { type TvSeries } from '@/types/tv-series';

export function useSearch() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<TvSeries[] | null>(null);

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
  }, []);

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
