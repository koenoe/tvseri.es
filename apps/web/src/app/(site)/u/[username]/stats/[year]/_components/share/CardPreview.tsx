'use client';

import Image from 'next/image';
import { useState } from 'react';

import { LATE_FADE } from '@/components/motion/lateFade';
import { TINT_TIMING } from '@/components/motion/swap';
import { didNotLoad } from '@/components/ui/error/unavailableCopy';
import FailedCard, { TryAgain } from '@/components/ui/failed/FailedCard';
import type { FailedLook } from '@/components/ui/failed/failedLooks';
import { pendingGlyph, warningGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { ROW_TRY_AGAIN } from '@/components/ui/row/rowFailedLook';
import cn from '@/lib/cn';

import type { CardFormat } from '../../_card/cardRequest';
import CardGhost from './CardGhost';

type Size = Readonly<{ width: number; height: number }>;

/**
 * The frame's ground follows the theme at colour's pace (`TINT_TIMING`),
 * so a new card's wait reads as the card changing colour
 */
const FRAME = `relative block shrink-0 overflow-hidden rounded-14 bg-ground-deep shadow-[0_24px_48px_-18px_rgb(0_0_0/0.8)] image-rim transition-[background-color] ${TINT_TIMING}`;

const MAKING = 'Making your card…';

/**
 * A card from the browser's or the CDN's cache lands within a frame or
 * two: the ghost waits this long first (`LATE_FADE`), so it never flashes
 */
const MAKING_FADE = cn('absolute inset-0 delay-200', LATE_FADE);

/** Centred in the frame: the 225px story leaves no room for a row */
const FAILED: FailedLook = {
  box: 'absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center',
  title: 'text-body-sm font-medium text-balance text-white',
};

const FAILED_MARK = (
  <Icon className="text-white/60" glyph={warningGlyph} size={20} />
);

const FAILED_TITLE = didNotLoad('Your card');

/**
 * What the frame has seen: the cards that loaded, the one that failed,
 * whether its Try again is running, and a count that gives each try a
 * fresh `<img>` (the route takes no cache-busting query)
 */
type Shown = Readonly<{
  attempt: number;
  failed: string | null;
  loaded: ReadonlySet<string>;
  retrying: boolean;
}>;

const NOTHING_YET: Shown = {
  attempt: 0,
  failed: null,
  loaded: new Set(),
  retrying: false,
};

/**
 * The card image, sized to the stage. One `<img>` per card (`key`): a
 * changed `src` on the same element keeps drawing the old card, scaled
 * into the new format's frame, until the new one arrives. A new element
 * shows the frame (the target aspect, on the card's own ground) instead:
 * `ground`, the Colour card's #1 show colour, fades in as the theme
 * changes, before its picture lands. Until the image has loaded (the card
 * is made on request and can take seconds) the frame holds the card's
 * ghost and says it's being made; the image stays transparent until then,
 * so a half-arrived file never shows. A card seen in this preview before
 * shows at once. If it fails, it says so with Try again (`onRetry`: the
 * sheet fetches its file again), which stays where it is, busy, while the
 * card loads again underneath. The share dialog's lift lands here
 * (`data-share-frame`).
 */
export default function CardPreview({
  alt,
  format,
  ground,
  onRetry,
  path,
  size,
}: Readonly<{
  alt: string;
  format: CardFormat;
  /** The Colour theme's ground; none: the dark one */
  ground: string | null;
  onRetry?: () => void;
  path: string;
  size: Size;
}>) {
  const [shown, setShown] = useState<Shown>(NOTHING_YET);
  const failed = shown.failed === path;
  const loaded = shown.loaded.has(path);
  const loading = !failed && !loaded;
  const image = cn('block', !loaded && 'opacity-0');
  const frameStyle = {
    backgroundColor: ground ?? undefined,
    height: size.height,
    width: size.width,
  };
  // The handlers belong to the one `<img>` for `path` (`key`), so a late
  // event never marks another card
  const markLoaded = () =>
    setShown((now) => ({
      ...now,
      failed: now.failed === path ? null : now.failed,
      loaded: new Set(now.loaded).add(path),
      retrying: false,
    }));
  const markFailed = () =>
    setShown((now) => ({ ...now, failed: path, retrying: false }));
  const retry = () => {
    setShown((now) => ({ ...now, attempt: now.attempt + 1, retrying: true }));
    onRetry?.();
  };
  return (
    <div className={FRAME} data-share-frame="" style={frameStyle}>
      {failed && !shown.retrying ? null : (
        <Image
          alt={alt}
          className={image}
          height={size.height}
          key={`${path}#${shown.attempt}`}
          onError={markFailed}
          onLoad={markLoaded}
          src={path}
          unoptimized
          width={size.width}
        />
      )}
      {loading ? <Making format={format} width={size.width} /> : null}
      {failed ? <Failed onRetry={retry} retrying={shown.retrying} /> : null}
      {/* One live region for the frame's life: its text changes, so it is
          read (not under aria-busy, which may hold it back until it's gone) */}
      <span className="sr-only" role="status">
        {loading ? MAKING : ''}
      </span>
    </div>
  );
}

/** The card's ghost, and a line that says so (it still turns with reduced motion) */
function Making({
  format,
  width,
}: Readonly<{ format: CardFormat; width: number }>) {
  return (
    <span aria-hidden className={MAKING_FADE}>
      <CardGhost format={format} width={width} />
      <span className="absolute inset-x-0 bottom-3 flex justify-center">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-black/40 px-3 text-meta text-white/80">
          <Icon glyph={pendingGlyph} size={13} />
          {MAKING}
        </span>
      </span>
    </span>
  );
}

/**
 * The card didn't load: said once (`alert`), with Try again; while that
 * runs, the card stays and says so (`status`), and focus stays on its button
 */
function Failed({
  onRetry,
  retrying,
}: Readonly<{ onRetry: () => void; retrying: boolean }>) {
  const action = (
    <TryAgain look={ROW_TRY_AGAIN} onClick={onRetry} pending={retrying} />
  );
  const role = retrying ? 'status' : 'alert';
  return (
    <FailedCard
      action={action}
      aria-busy={retrying}
      look={FAILED}
      mark={FAILED_MARK}
      role={role}
      title={FAILED_TITLE}
    />
  );
}
