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

type Props = Readonly<{
  /**
   * The section's loading skeleton (its hole's fallback): the failed card
   * takes exactly its space, so a read that fails late moves nothing
   */
  placeholder: ReactNode;
  /** What failed, for the title: "Your services" → "Your services didn’t load." */
  what: string;
}>;

/**
 * A Settings section's card, over its section's skeleton (hidden, holding
 * the space); its content centred down a tall section on a phone.
 * Each place keeps its own look on purpose; don't unify them.
 */
const SETTINGS_FAILED: FailedLook = {
  body: 'text-meta text-white/60',
  box: 'absolute inset-0 flex flex-col items-start justify-center gap-3 rounded-16 bg-white/4 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] md:flex-row md:items-center md:justify-start md:gap-6',
  text: 'flex min-w-0 flex-col gap-1 md:flex-1',
  title: 'text-body-sm font-semibold text-white',
};

const SETTINGS_TRY_AGAIN: TryAgainLook = {
  className:
    'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 border-white/20 bg-white/8 px-4 text-body-sm font-medium text-white transition-colors duration-150 hover:border-white/50 disabled:hover:border-white/20',
  glyph: 16,
};

/** The warning on its 40px disc, before the text */
const warningDisc = (
  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80">
    <Icon glyph={warningGlyph} size={20} />
  </span>
);

/** The section's "didn't load" card (also drawn in the style guide) */
export function SectionError({
  placeholder,
  retry,
  what,
}: Props & Readonly<{ retry: () => void }>) {
  const [retrying, startRetry] = useTransition();
  const onRetry = useCallback(() => startRetry(retry), [retry]);
  const action = (
    <TryAgain look={SETTINGS_TRY_AGAIN} onClick={onRetry} pending={retrying} />
  );
  return (
    <div className="relative">
      <div aria-hidden className="invisible" inert>
        {placeholder}
      </div>
      <FailedCard
        action={action}
        aria-busy={retrying}
        body={REST_IS_FINE}
        look={SETTINGS_FAILED}
        mark={warningDisc}
        role="alert"
        title={didNotLoad(what)}
      />
    </div>
  );
}

function SectionErrorFallback(props: Props, { retry }: ErrorInfo) {
  return <SectionError {...props} retry={retry} />;
}

/**
 * Wrap a settings hole (its Suspense boundary) so a failed read stays in that
 * card (the per-section error). `unauthorized()`, `notFound()` and
 * redirects pass through; Try again refetches the route.
 *
 * @example
 * <SectionErrorBoundary placeholder={skeleton} what="Your services">
 *   <Suspense fallback={skeleton}><Services /></Suspense>
 * </SectionErrorBoundary>
 */
const SectionErrorBoundary = catchError(SectionErrorFallback);

export default SectionErrorBoundary;
