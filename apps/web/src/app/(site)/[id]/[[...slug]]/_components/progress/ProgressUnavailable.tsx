'use client';

import { useEffect } from 'react';

import cn from '@/lib/cn';

import { useReloadViewer } from '../../_lib/viewerUnavailable';
import { PROGRESS_LINE_SPACE } from '../frames';

/**
 * The progress line when the viewer's marks didn't load: the same
 * box, an empty dashed track (the failed look) and "Your progress
 * didn't load · Try again", never "0 of 47 watched". It tries once by
 * itself when it appears (a slow first read usually answers the second
 * time); the store's real seed then replaces it with the line.
 */
export default function ProgressUnavailable({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const { failed, pending, retry } = useReloadViewer(seriesId);
  // Once, on mount: a retry the user did not have to ask for.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per mount
  useEffect(() => {
    retry();
  }, []);
  const message = failed
    ? 'Your progress still didn’t load'
    : 'Your progress didn’t load';
  return (
    <div
      className={cn(PROGRESS_LINE_SPACE, 'flex items-center gap-3 px-2.5')}
      data-slot="progress"
      data-state="unavailable"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-0 min-w-20 flex-1 border-white/25 border-t border-dashed"
      />
      <span className="whitespace-nowrap text-caption text-white/60">
        {message} ·{' '}
        <button
          className="cursor-pointer font-medium text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white disabled:cursor-default disabled:opacity-60"
          disabled={pending}
          onClick={retry}
          type="button"
        >
          {pending ? 'Loading…' : 'Try again'}
        </button>
      </span>
    </div>
  );
}
