'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import MultiSelect, { type Result } from './MultiSelect';

const fetchInitialResults = async (ids: string[]) => {
  const response = await fetch(
    `/api/keywords?id=${encodeURIComponent(ids.join(','))}`,
  );
  const keywords = (await response.json()) as Array<{
    id: number;
    name: string;
  }>;

  return keywords.map((keyword) => ({
    label: keyword.name,
    value: keyword.id.toString(),
  }));
};

function getInitialKeywordIdsFromParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const keywordIds = searchParams.get('with_keywords')?.split('|') ?? [];
  return keywordIds;
}

export default function DiscoverKeywords({
  className,
}: Readonly<{
  className?: string;
}>) {
  const [initialResults, setInitialResults] = useState<Result[]>([]);
  const [isPending, startTransition] = useTransition();
  const [initialFetchIsDone, setIsInitialFetchIsDone] = useState(false);

  const renderSelectItem = useCallback((item: Result) => {
    return <div className="text-sm">{item.label}</div>;
  }, []);

  const fetchResults = useCallback(
    async ({
      query,
      signal,
    }: Readonly<{
      query: string;
      signal: AbortSignal;
    }>) => {
      const response = await fetch(
        `/api/keywords?q=${encodeURIComponent(query)}`,
        { signal },
      );
      const keywords = (await response.json()) as Array<{
        id: number;
        name: string;
      }>;

      return keywords.map((keyword) => ({
        label: keyword.name,
        value: keyword.id.toString(),
      }));
    },
    [],
  );

  useEffect(() => {
    const initialKeywordIds = getInitialKeywordIdsFromParams();
    if (initialKeywordIds.length === 0) {
      setIsInitialFetchIsDone(true);
      return;
    }

    if (isPending || initialFetchIsDone) {
      return;
    }

    startTransition(async () => {
      try {
        const results = await fetchInitialResults(initialKeywordIds);
        setInitialResults(results);
      } catch (error) {
        console.error(error);
      }
      setIsInitialFetchIsDone(true);
    });
  }, [initialFetchIsDone, isPending]);

  // TODO: loading state?
  if (isPending || !initialFetchIsDone) {
    return null;
  }

  return (
    <MultiSelect
      className={className}
      classNameDropdown="flex flex-col gap-2"
      fetchResults={fetchResults}
      placeholder="Keywords"
      renderSelectItem={renderSelectItem}
      searchParamKey="with_keywords"
      searchParamSeparator="|"
      selectedResults={initialResults}
    />
  );
}
