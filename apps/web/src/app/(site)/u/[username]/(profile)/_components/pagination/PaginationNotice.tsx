'use client';

import type { PaginationStatus } from '../../_lib/pagination/usePaginated';

const reload = () => {
  window.location.reload();
};

/** Under an infinite list: an expired session or a failed page, with a way out */
export default function PaginationNotice({
  onRetry,
  status,
}: Readonly<{ onRetry: () => unknown; status: PaginationStatus }>) {
  if (status === 'unauthorized') {
    return (
      <p className="mt-6 text-center text-body-sm text-white/60">
        Your session has expired.{' '}
        <button
          className="underline hover:text-white"
          onClick={reload}
          type="button"
        >
          Reload the page
        </button>{' '}
        to continue.
      </p>
    );
  }
  if (status === 'error') {
    return (
      <p className="mt-6 text-center text-body-sm text-white/60">
        Couldn’t load more.{' '}
        <button
          className="underline hover:text-white"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </p>
    );
  }
  return null;
}
