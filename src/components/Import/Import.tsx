'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

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
    /(?:Season|Series|Part)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|Limited Series|[A-Z][a-z]+(?:st|nd|rd|th) Season/i,
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

  const delimiter = getDelimiter(value);
  const parts = value.split(delimiter);

  if (parts.length > 2) {
    if (part === 'title') return parts.slice(0, -1).join(delimiter);
    if (part === 'season') return '';
    if (part === 'episode') return parts[parts.length - 1];
  }

  if (parts.length > 1) {
    if (part === 'title') return parts[0];
    if (part === 'season') return '';
    if (part === 'episode') return parts.slice(1).join(delimiter);
  }

  if (part === 'title') return value;
  return '';
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

      // Note: filter out items that are probably films and not episodes of tv series
      const filteredData = data.filter(
        (item) =>
          item.episode &&
          item.title &&
          String(item.title).trim().length > 0 &&
          String(item.episode).trim().length > 0 &&
          item.title !== item.season,
      );

      setHideCsvImporter(true);
      setIsImporting(true);
      setTotalNumberOfItems(filteredData.length);

      (async () => {
        try {
          const response = await fetch('/api/account/import', {
            method: 'POST',
            body: JSON.stringify(filteredData),
            signal: controller.signal,
          });

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No reader available');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setIsImporting(false);
              break;
            }

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
              try {
                const data = JSON.parse(line);

                setSuccessCount((prev) => prev + data.successCount);
                setErrors((prev) => [...prev, ...data.errors]);
              } catch (_) {
                console.error('Failed to parse line:', line);
              }
            }
          }
        } catch (err) {
          const error = err as Error;
          if (error.name !== 'AbortError') {
            setErrors((prev) => [
              ...prev,
              {
                item: {
                  title: '',
                  date: '',
                  season: '',
                  episode: '',
                  watchProvider: '',
                },
                error: `Import failed: ${error.message}`,
              },
            ]);
          }
        }
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
                }}
                animate={{
                  opacity: 1,
                }}
              />
            )}
          </AnimatePresence>

          <div className="mt-24 inline-flex items-center text-2xl text-white/55">
            <span className="mr-4 rounded bg-[#666] px-4 py-1 font-semibold text-white">
              {successCount.toLocaleString()}
            </span>
            items successfully imported out of
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