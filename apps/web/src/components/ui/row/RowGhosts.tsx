import type { ReactNode } from 'react';

import cn from '@/lib/cn';

/** enough cards to fill the widest row (7 + a peek) */
const SLOTS = Array.from({ length: 8 }, (_, i) => i);

/** A loading ghost's fill, without the pulse (for shapes inside a pulsing block) */
export const GHOST_FILL = 'bg-white/5';

/**
 * `GHOST_FILL` over a finished surface's own background (`!`), written out
 * in full because Tailwind reads class names from the source
 */
export const GHOST_FILL_OVER = '!bg-white/5';

/**
 * The slot looks, also for a section's own placeholders (a landing's hero, a
 * grid). Loading and retrying pulse (`animate-ghost`, one timing app-wide,
 * globals.css); failed stays static.
 */
export const GHOST_LOOK = {
  // dashed outlines where the cards would be
  failed: 'border border-dashed border-white/14',
  loading: `${GHOST_FILL} animate-ghost`,
  // the error pulse (white/2 → white/6) as an opacity pulse on white/6
  retrying: 'border border-dashed border-white/14 bg-white/6 animate-ghost',
} as const;

/** The slots' own look: inside the row the whole block pulses, not each slot */
const SLOT_LOOK: Readonly<Record<Look, string>> = {
  failed: GHOST_LOOK.failed,
  loading: GHOST_FILL,
  retrying: 'border border-dashed border-white/14 bg-white/6',
};

/**
 * The lines under a tile, as the loaded tile draws them: each a bar in the
 * line box of the text it stands for (`h-6` = text-body-sm, `h-5` =
 * text-caption / the meta row), after the tile's 8px (12 on desktop).
 * - `meta`: one meta line (a reason under a poster, the facts under a backdrop)
 * - `hub`: the hub poster's title and meta line, desktop only (phones draw the poster alone)
 */
export type GhostCaption = 'hub' | 'meta';

type Look = keyof typeof GHOST_LOOK;

const LINE_BAR = 'h-3 rounded-4';

/** A bar in the line box of the text it stands for (`className` sets the line's height) */
export function GhostLine({
  className,
  inPulse,
  look,
  width,
}: Readonly<{
  className: string;
  /** inside a block that already pulses (a row's rail): no pulse of its own */
  inPulse?: boolean;
  look: Look;
  width: string;
}>) {
  const bar = cn(LINE_BAR, width, inPulse ? SLOT_LOOK[look] : GHOST_LOOK[look]);
  return (
    <span className={cn('flex items-center', className)}>
      <span className={bar} />
    </span>
  );
}

const CAPTION: Readonly<Record<GhostCaption, (look: Look) => ReactNode>> = {
  hub: (look) => (
    <span className="flex flex-col gap-2 max-md:hidden">
      <GhostLine className="h-6" inPulse look={look} width="w-3/4" />
      <GhostLine className="h-5" inPulse look={look} width="w-1/2" />
    </span>
  ),
  meta: (look) => (
    <GhostLine className="h-5" inPulse look={look} width="w-2/3" />
  ),
};

/**
 * Empty card slots in the row's exact geometry, so a skeleton or an error
 * takes the loaded row's place and nothing jumps. Decorative.
 */
export default function RowGhosts({
  caption,
  look,
  tile,
}: Readonly<{
  caption?: GhostCaption;
  look: Look;
  /**
   * A tile's own ghost, built from its layout (a card's lines and posters),
   * drawn in each slot instead of the plain card; it fills the slot's
   * `--tile-ghost-h`
   */
  tile?: ReactNode;
}>) {
  // a numbered row's ghost is its poster, at the poster's place (`--tile-ghost-inset`)
  const card = cn(
    'ml-(--tile-ghost-inset,0px) aspect-(--tile-aspect) h-[var(--tile-ghost-h,auto)] w-[calc(100%-var(--tile-ghost-inset,0px))] shrink-0 rounded-(--tile-radius)',
    SLOT_LOOK[look],
  );
  // one pulsing layer per row (failed rows stay static)
  const rail = cn(
    'flex items-start gap-(--row-gap) overflow-hidden pr-(--row-end) pl-(--row-start)',
    look !== 'failed' && 'animate-ghost',
  );
  return (
    <div aria-hidden className={rail}>
      {SLOTS.map((i) => (
        <span
          className="flex w-(--row-tile) shrink-0 flex-col gap-2 md:gap-3"
          key={i}
        >
          {tile ? (
            <span className="h-(--tile-ghost-h) w-full shrink-0 overflow-hidden">
              {tile}
            </span>
          ) : (
            <span className={card} />
          )}
          {caption ? CAPTION[caption](look) : null}
        </span>
      ))}
    </div>
  );
}

/**
 * A title that comes with the data, as a bar inside the heading: it keeps the
 * heading's line box (title-2 is 28px tall, 32 on desktop), so the title's
 * arrival moves nothing.
 */
export function TitleGhost({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-5 w-72 max-w-full rounded-6 align-middle md:h-6',
        GHOST_LOOK.loading,
        className,
      )}
    />
  );
}
