import { memo } from 'react';

import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import Ring from './Ring';
import { quietButton } from './styles';

const SKELETON: Readonly<Record<'backdrop' | 'title', string>> = {
  backdrop: 'w-[120px]',
  title: 'w-[168px]',
};

const PHONE_SKELETON: Readonly<Record<'backdrop' | 'title', string>> = {
  backdrop: 'w-32',
  title: 'w-40',
};

/** The strip's one pulsing layer */
const STRIP_GHOST = cn(
  'flex min-w-0 items-center gap-2 overflow-hidden',
  PULSE,
);

/** Grey tiles that hold a strip's place while it loads. */
export const Skeletons = memo(function Skeletons({
  count,
  kind,
  phone = false,
}: Readonly<{ count: number; kind: 'backdrop' | 'title'; phone?: boolean }>) {
  const tile = cn(
    'shrink-0 rounded-8',
    GHOST_FILL,
    phone ? 'h-[72px]' : 'h-[66px]',
    (phone ? PHONE_SKELETON : SKELETON)[kind],
  );
  return (
    <div aria-hidden="true" className={STRIP_GHOST}>
      {Array.from({ length: count }, (_, index) => (
        <span className={tile} key={index} />
      ))}
    </div>
  );
});

Skeletons.displayName = 'Skeletons';

/** The ring and "Loading … from TMDB…". */
export const LoadingLine = memo(function LoadingLine({
  label,
}: Readonly<{ label: string }>) {
  return (
    <span
      className="flex items-center gap-2 text-[13px] leading-5 whitespace-nowrap text-white/60"
      role="status"
    >
      <Ring tone="light" />
      {label}
    </span>
  );
});

LoadingLine.displayName = 'LoadingLine';

/** Not drawn on the board: TMDB didn't answer. */
export const LoadError = memo(function LoadError({
  onRetry,
}: Readonly<{ onRetry: () => void }>) {
  const className = quietButton();
  return (
    <span
      className="flex items-center gap-2 text-[13px] leading-5 text-white/60"
      role="alert"
    >
      Couldn’t load the images from TMDB.
      <button className={className} onClick={onRetry} type="button">
        Try again
      </button>
    </span>
  );
});

LoadError.displayName = 'LoadError';
