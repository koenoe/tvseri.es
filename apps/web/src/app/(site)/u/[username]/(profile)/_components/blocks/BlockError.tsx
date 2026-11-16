'use client';

import { catchError, type ErrorInfo } from 'next/error';
import { type ReactNode, useCallback, useTransition } from 'react';

import {
  didNotLoad,
  REST_IS_FINE,
} from '@/components/ui/error/unavailableCopy';
import FailedCard, { TryAgain } from '@/components/ui/failed/FailedCard';
import type {
  FailedLook,
  TryAgainLook,
} from '@/components/ui/failed/failedLooks';
import { warningGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { PROFILE_TRY_AGAIN } from './profileTryAgain';

type Props = Readonly<{
  /** the block's placeholder: the failed card lies over it, so it is exactly its size */
  fallback: ReactNode;
  /**
   * `card` (default): the warning, the title, one line and Try again;
   * `line`: a block of one or two lines (the sidebar's counts, the follow
   * button), one line with Try again and no explanation
   */
  look?: 'card' | 'line';
  title: string;
}>;

/**
 * The profile's two failed looks: the card, and the one line of a small
 * block. Each place keeps its signed-off look (owner, 15 Nov 2026); unify
 * only with his approval.
 */
const LOOKS: Readonly<
  Record<
    'card' | 'line',
    Readonly<{
      body?: string;
      card: FailedLook;
      mark: ReactNode;
      tryAgain: TryAgainLook;
    }>
  >
> = {
  card: {
    body: REST_IS_FINE,
    card: {
      body: 'm-0 text-caption text-white/60',
      box: 'visible absolute inset-0 flex min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-16 bg-[#232a2b] p-4 text-center shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]',
      title: 'm-0 text-body-sm font-semibold text-white',
    },
    mark: <Icon className="text-white/60" glyph={warningGlyph} size={20} />,
    tryAgain: PROFILE_TRY_AGAIN,
  },
  line: {
    card: {
      box: 'visible absolute inset-0 flex min-w-0 items-center gap-2 overflow-hidden rounded-10 bg-[#232a2b] px-3 text-caption text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]',
      title: 'min-w-0 flex-1 truncate',
    },
    mark: (
      <Icon className="shrink-0 text-white/60" glyph={warningGlyph} size={14} />
    ),
    tryAgain: {
      className:
        'inline-flex shrink-0 items-center gap-1 font-medium text-white hover:underline disabled:hover:no-underline',
      glyph: 12,
    },
  },
};

/**
 * The failed card over a block's placeholder, with Try again. `className`
 * is the card's own box (a block drawn in two variants shows one card per
 * variant, each hidden with its variant).
 */
export function FailedBlock({
  className,
  fallback,
  look = 'card',
  retry,
  title,
}: Props & Readonly<{ className?: string; retry: () => void }>) {
  const [retrying, startRetry] = useTransition();
  const onRetry = useCallback(() => startRetry(retry), [retry]);
  const drawn = LOOKS[look];
  const action = (
    <TryAgain look={drawn.tryAgain} onClick={onRetry} pending={retrying} />
  );
  return (
    // the placeholder only holds the space: hidden, so nothing of it shows
    // past the card's rounded corners (a heading's first letter did)
    <div aria-busy={retrying} className={cn('invisible relative', className)}>
      {fallback}
      <FailedCard
        action={action}
        body={drawn.body}
        look={drawn.card}
        mark={drawn.mark}
        role="alert"
        title={didNotLoad(title)}
      />
    </div>
  );
}

function BlockErrorFallback(props: Props, { retry }: ErrorInfo) {
  return <FailedBlock {...props} retry={retry} />;
}

/**
 * A profile block's failure (the read threw): the card lies over the block's
 * own placeholder, so a failed block takes exactly the space it held while
 * loading and never spills out of a lane or the sidebar. Try again refetches
 * the page's stream; a profile is never cached, so the next visit retries too.
 */
const BlockError = catchError(BlockErrorFallback);

export default BlockError;
