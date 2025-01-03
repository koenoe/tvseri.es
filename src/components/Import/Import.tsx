'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import slugify from 'slugify';

import { type Field } from '@/hooks/useCsvParser';
import { type WatchProvider } from '@/types/watch-provider';

import Ripple from './Ripple';
import CsvImporter from '../CsvImporter/CsvImporter';

type Part = 'title' | 'season' | 'episode';

type ImportError = {
  item: {
    title: string;
    date: string;
    season: string;
    episode: string;
  };
  error: string;
};

const MotionRipple = motion.create(Ripple);

const getDelimiter = (value: string): string => {
  const colonCount = (value.match(/:\s/g) || []).length;
  const dashCount = (value.match(/-\s/g) || []).length;
  const emDashCount = (value.match(/–\s/g) || []).length;

  return colonCount >= dashCount && colonCount >= emDashCount
    ? ': '
    : dashCount >= emDashCount
      ? '- '
      : '– ';
};

const formatPart = (value: string, part: Part): string => {
  const seasonMatch = value.match(
    /(?:Season|Seizoen|Deel|Hoofdstuk|Boek|Series|Part|Volume|Tiger King|Stranger Things)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|Limited Series|Miniserie|(?:The\s+Complete\s+)?[A-Z][a-z]+(?:st|nd|rd|th)\s+(Season|Series)/i,
  );

  if (seasonMatch) {
    if (part === 'title') {
      return value
        .substring(0, seasonMatch.index)
        .trim()
        .replace(/[:\\—–-]\s*$/, '');
    }
    if (part === 'season') {
      return seasonMatch[0];
    }
    if (part === 'episode') {
      return value
        .substring(seasonMatch.index! + seasonMatch[0].length)
        .trim()
        .replace(/^[:\\—–-]\s*/, '');
    }
  }

  const episodeMatch = value.match(
    /(Chapter|Episode|Aflevering)\s+\d+(?:[:\\—–-]\s*|\s+).*/i,
  );

  if (episodeMatch) {
    if (part === 'title') {
      return value
        .substring(0, episodeMatch.index)
        .trim()
        .replace(/[:\\—–-]\s*$/, '');
    }
    if (part === 'season') return '';
    if (part === 'episode') return episodeMatch[0];
  }

  const delimiter = getDelimiter(value);
  const parts = value.split(delimiter);

  if (parts.length > 2) {
    const chapterMatch = parts[1].match(
      /Chapter\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)/i,
    );

    if (chapterMatch) {
      if (part === 'title') return parts[0];
      if (part === 'season') return chapterMatch[0];
      if (part === 'episode') return parts[parts.length - 1];
    } else {
      if (part === 'title') return parts.slice(0, -1).join(delimiter);
      if (part === 'season') return '';
      if (part === 'episode') return parts[parts.length - 1];
    }
  }

  if (parts.length > 1) {
    if (part === 'title') return parts[0];
    if (part === 'season') return '';
    if (part === 'episode') return parts.slice(1).join(delimiter);
  }

  if (part === 'title') return value;
  return '';
};

const CHUNK_SIZE = 50;

const processChunk = async (
  chunk: Record<string, unknown>[],
  signal: AbortSignal,
  cb: (successCount: number, errors: ImportError[]) => void,
) => {
  const response = await fetch('/api/account/import', {
    method: 'POST',
    body: JSON.stringify(chunk),
    signal,
  });

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No reader available');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = new TextDecoder().decode(value);
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        cb(data.successCount, data.errors);
      } catch (_) {
        console.error('Failed to parse line:', line);
      }
    }
  }
};

export default function Import({
  watchProviders,
}: Readonly<{
  watchProviders: WatchProvider[];
}>) {
  const [isImporting, setIsImporting] = useState(false);
  const [hideCsvImporter, setHideCsvImporter] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [totalNumberOfItems, setTotalNumberOfItems] = useState(0);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleImport = useCallback<(data: Record<string, unknown>[]) => void>(
    (data) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Note: filter out duplicates
      const uniqueItemKeys = new Set();
      const uniqueItems = data.filter((item) => {
        const uniqueItemKey = slugify(
          `${item.title}${item.season}${item.episode}`,
          { lower: true, strict: true, trim: true },
        );
        if (uniqueItemKeys.has(uniqueItemKey)) {
          return false;
        }
        uniqueItemKeys.add(uniqueItemKey);
        return true;
      });

      // Note: filter out items that are probably films and not episodes of tv series
      const filteredItems = uniqueItems.filter((item) => {
        const normalizedTitle = (item?.title ?? '')
          .toString()
          .toLowerCase()
          .trim();
        const normalizedEpisode = (item?.episode ?? '')
          .toString()
          .toLowerCase()
          .trim();
        const normalizedSeason = (item?.season ?? '')
          .toString()
          .toLowerCase()
          .trim();
        const isMovie = 'Type' in item && String(item.Type) === 'Movie';
        const isTrailer = normalizedEpisode.includes('trailer');

        return (
          normalizedTitle.length > 0 &&
          normalizedEpisode.length > 0 &&
          normalizedTitle !== normalizedSeason &&
          !isMovie &&
          !isTrailer
        );
      });

      setHideCsvImporter(true);
      setIsImporting(true);
      setTotalNumberOfItems(filteredItems.length);

      (async () => {
        try {
          const chunks = Array.from(
            { length: Math.ceil(filteredItems.length / CHUNK_SIZE) },
            (_, i) => filteredItems.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          );

          for (const chunk of chunks) {
            await processChunk(
              chunk,
              controller.signal,
              (chunkSuccessCount, chunkErrors) => {
                setSuccessCount((prev) => prev + chunkSuccessCount);
                setErrors((prev) => [...prev, ...chunkErrors]);
              },
            );
          }
        } catch (err) {
          const error = err as Error;
          if (error.name !== 'AbortError') {
            setErrors((prev) => [
              ...prev,
              {
                item: { title: '', date: '', season: '', episode: '' },
                error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ]);
          }
        }

        setIsImporting(false);
      })();
    },
    [],
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fields: Field[] = [
    {
      label: 'Title',
      value: 'title',
      format: (value) => formatPart(value, 'title'),
    },
    {
      label: 'Date',
      value: 'date',
    },
    {
      label: 'Season',
      value: 'season',
      format: (value) => formatPart(value, 'season'),
    },
    {
      label: 'Episode',
      value: 'episode',
      format: (value) => formatPart(value, 'episode'),
    },
    {
      label: 'Streaming service',
      value: 'watchProvider',
      predefined: watchProviders.map((provider) => provider.name),
    },
  ];

  return (
    <div className="space-y-4">
      {!hideCsvImporter ? (
        <CsvImporter fields={fields} onImport={handleImport} />
      ) : (
        <div className="flex flex-col items-center">
          <AnimatePresence>
            {isImporting && (
              <MotionRipple
                key="ripple"
                className="!fixed -top-[15rem] left-0 md:-top-[20rem]"
                initial={{
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  type: 'tween',
                  ease: [0.4, 0, 0.2, 1],
                  duration: 0.25,
                }}
              />
            )}
          </AnimatePresence>

          <div className="mt-24 inline-flex flex-nowrap items-center text-lg text-white/55 md:text-2xl">
            <span className="mr-4 rounded bg-[#666] px-4 py-1 font-semibold text-white">
              {successCount.toLocaleString()}
            </span>
            items imported out of
            <span className="ml-2 font-semibold text-white">
              {totalNumberOfItems.toLocaleString()}
            </span>{' '}
            .
          </div>

          {errors.length > 0 && (
            <div className="relative w-full pt-10">
              <h3 className="mb-4 font-semibold">
                Failed items ({errors.length})
              </h3>
              <div className="flex flex-col space-y-4">
                {errors.map((error, index) => (
                  <div key={index} className="rounded-md bg-neutral-800 p-4">
                    <h4 className="text-lg font-semibold text-red-400">
                      {error.item.title}
                    </h4>
                    <p className="mt-1 text-xs text-red-300">{error.error}</p>
                    <p className="mt-2 text-[0.6rem] text-white/40">
                      {`${error.item.season ? `${error.item.season}: ` : ''}${error.item.episode}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
