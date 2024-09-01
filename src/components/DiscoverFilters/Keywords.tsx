'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import MultiSelect, { type Result } from './MultiSelect';

const fetchInitialResults = async (ids: string[]) => {
  const response = await fetch(
    `/api/tv/keywords?id=${encodeURIComponent(ids.join(','))}`,
  );
  const keywords = (await response.json()) as Array<{
    id: number;
    name: string;
  }>;

  return keywords.map((keyword) => ({
    value: keyword.id.toString(),
    label: keyword.name,
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
  const fetchIsInitiated = useRef(false);

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
        `/api/tv/keywords?q=${encodeURIComponent(query)}`,
        { signal },
      );
      const keywords = (await response.json()) as Array<{
        id: number;
        name: string;
      }>;

      return keywords.map((keyword) => ({
        value: keyword.id.toString(),
        label: keyword.name,
      }));
    },
    [],
  );

  useEffect(() => {
    const initialKeywordIds = getInitialKeywordIdsFromParams();
    if (
      isPending ||
      initialKeywordIds.length === 0 ||
      initialResults.length > 0 ||
      fetchIsInitiated.current
    ) {
      return;
    }

    fetchIsInitiated.current = true;

    startTransition(async () => {
      try {
        const results = await fetchInitialResults(initialKeywordIds);
        setInitialResults(results);
      } catch (error) {
        console.error(error);
      }
    });
  }, [initialResults.length, isPending]);

  // TODO: loading state?
  if (isPending) {
    return null;
  }

  return (
    <MultiSelect
      className={className}
      classNameDropdown="flex flex-col gap-2"
      searchParamKey="with_keywords"
      searchParamSeparator="|"
      placeholder="Keywords"
      renderSelectItem={renderSelectItem}
      fetchResults={fetchResults}
      selectedResults={initialResults}
    />
  );
}
