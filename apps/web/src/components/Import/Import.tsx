'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { AnimatePresence, motion, type Transition } from 'motion/react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Field } from '@/hooks/useCsvParser';
import { readNdjson } from '@/lib/import/ndjson';
import { splitEntry } from '@/lib/import/parseEntry';
import { prepareRows } from '@/lib/import/prepareRows';
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_ENDPOINT,
  type ImportError,
  type ImportEvent,
  type ImportRow,
  isImportEvent,
} from '@/lib/import/types';

import Ripple from './Ripple';
import SkeletonImport from './SkeletonImport';

const CsvImporter = dynamic(() => import('../CsvImporter/CsvImporter'), {
  loading: () => <SkeletonImport />,
  ssr: false,
});

const MotionRipple = motion.create(Ripple);

async function* postChunk(
  rows: ReadonlyArray<ImportRow>,
  signal: AbortSignal,
): AsyncGenerator<ImportEvent> {
  const response = await fetch(IMPORT_ENDPOINT, {
    body: JSON.stringify(rows),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (response.status === 401) {
    throw new Error('your session has expired, please sign in again');
  }
  if (!response.ok || !response.body) {
    throw new Error(`the server responded with ${response.status}`);
  }

  for await (const value of readNdjson(response.body)) {
    if (!isImportEvent(value)) {
      throw new Error('unexpected response from the server');
    }
    yield value;
  }
}

const createFields = (
  watchProviders: ReadonlyArray<WatchProvider>,
): Field[] => [
  {
    format: (value) => splitEntry(value).title,
    label: 'Title',
    value: 'title',
  },
  {
    label: 'Date',
    value: 'date',
  },
  {
    format: (value) => splitEntry(value).season,
    label: 'Season',
    value: 'season',
  },
  {
    format: (value) => splitEntry(value).episode,
    label: 'Episode',
    value: 'episode',
  },
  {
    label: 'Streaming service',
    predefined: watchProviders.map((provider) => provider.name),
    value: 'watchProvider',
  },
];

const rippleAnimate = { opacity: 1, scale: 1 };
const rippleInitial = { opacity: 0, scale: 0 };
const rippleTransition: Transition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
  type: 'tween',
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
  const [hasAssumedDates, setHasAssumedDates] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleImport = useCallback((data: Record<string, unknown>[]) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const prepared = prepareRows(data);
    const { rows, errors: rowErrors } = prepared;

    setHideCsvImporter(true);
    setIsImporting(true);
    setFailure(null);
    setHasAssumedDates(prepared.hasAssumedDates);
    setSuccessCount(0);
    setErrors(rowErrors);
    setTotalNumberOfItems(rows.length + rowErrors.length);

    (async () => {
      try {
        for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
          const chunk = rows.slice(i, i + IMPORT_CHUNK_SIZE);
          for await (const event of postChunk(chunk, controller.signal)) {
            if (event.status === 'error') {
              throw new Error(event.error);
            }
            setSuccessCount((prev) => prev + event.successCount);
            setErrors((prev) => [...prev, ...event.errors]);
          }
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          setFailure(
            `Import failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }
      }

      setIsImporting(false);
    })();
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fields = useMemo(() => createFields(watchProviders), [watchProviders]);

  return (
    <div className="space-y-4">
      {!hideCsvImporter ? (
        <CsvImporter fields={fields} onImport={handleImport} />
      ) : (
        <div className="flex flex-col items-center">
          <AnimatePresence>
            {isImporting ? (
              <MotionRipple
                animate={rippleAnimate}
                className="!fixed -top-[15rem] left-0 md:-top-[20rem]"
                initial={rippleInitial}
                key="ripple"
                transition={rippleTransition}
              />
            ) : null}
          </AnimatePresence>

          <div
            aria-live="polite"
            className="mt-24 inline-flex flex-nowrap items-center text-lg text-white/55 md:text-2xl"
            role="status"
          >
            <span className="mr-4 rounded bg-[#666] px-4 py-1 font-semibold text-white">
              {successCount.toLocaleString()}
            </span>
            items imported out of
            <span className="ml-2 font-semibold text-white">
              {totalNumberOfItems.toLocaleString()}
            </span>{' '}
            .
          </div>

          {hasAssumedDates ? (
            <p className="mt-6 text-sm text-white/55">
              Some dates were ambiguous: 05/06/24 was read as month/day,
              05.06.2024 and 05-06-2024 as day/month.
            </p>
          ) : null}

          {failure ? (
            <p className="mt-6 text-sm text-red-400" role="alert">
              {failure}
            </p>
          ) : null}

          {errors.length > 0 && (
            <div className="relative w-full pt-10">
              <h3 className="mb-4 font-semibold">
                Failed items ({errors.length})
              </h3>
              <div className="flex flex-col space-y-4">
                {errors.map((error, index) => (
                  <div className="rounded-md bg-neutral-800 p-4" key={index}>
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
