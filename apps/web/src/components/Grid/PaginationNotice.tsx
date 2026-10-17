'use client';

import { memo } from 'react';

import type { PaginationStatus } from '@/hooks/usePaginated';

const reloadPage = () => {
  window.location.reload();
};

function PaginationNotice({
  status,
  onRetry,
}: Readonly<{
  status: PaginationStatus;
  onRetry: () => unknown;
}>) {
  if (status === 'unauthorized') {
    return (
      <p className="mt-6 text-center text-sm text-white/60">
        Your session has expired.{' '}
        <button className="underline" onClick={reloadPage} type="button">
          Reload the page
        </button>{' '}
        to continue.
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p className="mt-6 text-center text-sm text-white/60">
        Couldn&apos;t load more.{' '}
        <button className="underline" onClick={onRetry} type="button">
          Try again
        </button>
      </p>
    );
  }

  return null;
}

PaginationNotice.displayName = 'PaginationNotice';

export default memo(PaginationNotice);
