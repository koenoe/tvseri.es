'use client';

import { catchError, type ErrorInfo } from 'next/error';
import { type ReactNode, useCallback, useTransition } from 'react';

import RowError, { SectionError } from './RowError';
import type { GhostCaption } from './RowGhosts';
import type { RowHeading } from './RowHeader';
import type { RowInset, RowLook, RowTiles } from './rowLayout';

type Props = Omit<RowHeading, 'count' | 'seeAllHref'> &
  Readonly<{
    /** the lines under each tile, as the row's skeleton draws them */
    caption?: GhostCaption;
    /** the same id as the Row it guards */
    id: string;
    inset?: RowInset;
    look?: RowLook;
    /**
     * A section that isn't a tile row: its loading placeholder (the
     * Suspense fallback), which the failure keeps under the card
     * (`SectionError`), so a late failure moves nothing
     */
    placeholder?: ReactNode;
    /** the failed state's min-height where the section isn't a tile row (`RowError`) */
    reserve?: string;
    tiles?: RowTiles;
  }>;

function RetryableRowError({
  placeholder,
  retry,
  ...props
}: Props & Readonly<{ retry: () => void }>) {
  // `retry()` refetches the page's RSC payload in a transition; the row
  // shows "Loading…" until that settles, then the row or the error again.
  const [retrying, startRetry] = useTransition();
  const onRetry = useCallback(() => startRetry(retry), [retry]);
  if (placeholder) {
    const { inset, title } = props;
    return retrying ? (
      <SectionError
        inset={inset}
        placeholder={placeholder}
        state="retrying"
        title={title}
      />
    ) : (
      <SectionError
        inset={inset}
        onRetry={onRetry}
        placeholder={placeholder}
        state="failed"
        title={title}
      />
    );
  }
  return retrying ? (
    <RowError {...props} state="retrying" />
  ) : (
    <RowError {...props} onRetry={onRetry} state="failed" />
  );
}

function RowErrorFallback(props: Props, { retry }: ErrorInfo) {
  return <RetryableRowError {...props} retry={retry} />;
}

/**
 * Wrap a streamed row (its Suspense boundary) so a failure stays in that row
 * (`catchError()` per row). Next's `catchError` lets `notFound()` and
 * redirects through and clears itself on navigation; Try again is its
 * `retry()`.
 *
 * @example
 * <RowErrorBoundary id="hidden-gems" title="Hidden gems">
 *   <Suspense fallback={<RowSkeleton id="hidden-gems" title="Hidden gems" />}>
 *     <HiddenGems />
 *   </Suspense>
 * </RowErrorBoundary>
 */
const RowErrorBoundary = catchError(RowErrorFallback);

export default RowErrorBoundary;
