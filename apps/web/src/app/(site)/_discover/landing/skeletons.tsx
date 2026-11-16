import type { ReactNode } from 'react';

import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';
import { RowErrorCard } from '@/components/ui/row/RowError';
import {
  GHOST_FILL,
  GHOST_LOOK,
  GhostLine,
  TitleGhost,
} from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { CHIPS_LINE, LandingHero, TITLE_SPACE } from './LandingHero';

/**
 * `loading`: a Suspense fallback (the fill, `aria-busy` where the section
 * says so). `failed`: the section's data is `Unavailable` in the cached page
 * (the failed row: dashed outlines, settled, with the "didn’t load"
 * card where the section has a title).
 */
export type PlaceholderLook = 'failed' | 'loading';

const bar = (look: PlaceholderLook) => cn('block rounded-8', GHOST_LOOK[look]);

/** The row switch's place while it loads (the Segmented's 38px pill) */
export function SwitchGhost() {
  return (
    <span
      aria-hidden
      className={cn('block h-9.5 w-72 rounded-full', GHOST_LOOK.loading)}
    />
  );
}

type DetailsSkeletonProps = Readonly<{
  /** with the chips line (`LandingChips`) */
  chips?: boolean;
  /** the chips have an overline heading on desktop ("Often tagged with") */
  chipsHeading?: boolean;
  /** how many facts the hero has (Genre: 4) */
  facts?: number;
  /** the hero's line: the real one when it needs no API (it's static copy), `true` for a bar, nothing for none */
  line?: ReactNode;
  look?: PlaceholderLook;
}>;

/**
 * Everything under the hero's title while its data loads, at the loaded
 * size: the meta line, the line, the facts and the chips. Put it in the
 * `<Suspense>` around the hero's gated details; the crumb and the title
 * (from the slug) stay real in the shell. `look="failed"` when the data is
 * `Unavailable`.
 */
export function LandingHeroDetailsSkeleton({
  chips = true,
  chipsHeading = false,
  facts = 0,
  line,
  look = 'loading',
}: DetailsSkeletonProps) {
  const block = bar(look);
  const chip = cn('block h-8 w-24 shrink-0 rounded-full', GHOST_LOOK[look]);
  return (
    <>
      <span aria-hidden className={`${block} mt-2 h-5 w-64`} />
      {line === true ? (
        <span
          aria-hidden
          className={`${block} mt-3 h-6 w-full max-w-[600px] md:h-7`}
        />
      ) : (
        (line ?? null)
      )}
      {facts > 0 ? (
        <span
          aria-hidden
          className="mt-6 grid w-full grid-cols-2 gap-x-6 gap-y-4 md:mt-10 md:flex md:w-auto md:gap-12"
        >
          {Array.from({ length: facts }, (_, index) => (
            <span className="flex flex-col gap-1" key={index}>
              <span className={`${block} h-8 w-24 md:h-10`} />
              <span className="flex flex-col">
                <GhostLine className="h-5" look={look} width="w-28" />
                {/* the second fact's caption names a genre ("are also Action & Adventure"): two lines in a phone's 151px column */}
                {index === 1 ? (
                  <GhostLine
                    className="h-5 md:hidden"
                    look={look}
                    width="w-20"
                  />
                ) : null}
              </span>
            </span>
          ))}
        </span>
      ) : null}
      {chipsHeading ? (
        <span aria-hidden className={`${block} mt-10 h-5 w-32 max-md:hidden`} />
      ) : null}
      {chips ? (
        <span
          aria-hidden
          className={cn(
            CHIPS_LINE,
            // the swipe line's chips past the screen's edge are cut, not
            // scrolled; from md the ghosts stay on the one line the chips
            // most often take (the wrapped ones are cut), as the hero's size
            'overflow-hidden md:max-h-8',
            chipsHeading ? 'md:mt-2' : 'md:mt-6',
          )}
        >
          {Array.from({ length: chipsHeading ? 8 : 5 }, (_, index) => (
            <span className={chip} key={index} />
          ))}
        </span>
      ) : null}
    </>
  );
}

/**
 * The recommendation tile while it loads, built from `Spotlight`'s layout:
 * the kicker, the title (the logo's 32 / 44px line), the meta line
 * (desktop), the reason and the two pills, at the bottom of the tile.
 */
function SpotlightGhost() {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-75 flex-col justify-end rounded-16 md:h-110',
        GHOST_LOOK.loading,
      )}
    >
      <span className="flex flex-col items-start p-4 md:p-8">
        <GhostLine className="h-5" inPulse look="loading" width="w-24" />
        <GhostLine
          className="mt-2 h-8 md:mt-4 md:h-11"
          inPulse
          look="loading"
          width="w-48 md:w-64"
        />
        <GhostLine
          className="mt-4 h-5 max-md:hidden"
          inPulse
          look="loading"
          width="w-56"
        />
        <GhostLine
          className="mt-2 h-6 md:mt-3"
          inPulse
          look="loading"
          width="w-4/5 max-w-[520px]"
        />
        <span className="mt-4 flex items-center gap-2 md:mt-6 md:gap-3">
          <span className={cn('h-10 w-31 rounded-full', GHOST_FILL)} />
          <span className={cn('h-10 w-27 rounded-full', GHOST_FILL)} />
        </span>
      </span>
    </span>
  );
}

/**
 * One Where to start card while it loads, from `WhereToStart`'s card: the
 * poster (72 / 96 wide) and, beside it, the kicker, title, meta line and
 * reason, each a bar in its line box
 */
function StartCardGhost({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid h-37 grid-cols-[72px_minmax(0,1fr)] items-start gap-4 overflow-hidden rounded-16 p-4 md:h-48 md:grid-cols-[96px_minmax(0,1fr)] md:gap-6 md:p-6',
        GHOST_LOOK.loading,
        className,
      )}
    >
      <span className={cn('block aspect-2/3 rounded-8', GHOST_FILL)} />
      <span className="flex min-w-0 flex-col" data-placeholder="start-text">
        <GhostLine className="h-5" inPulse look="loading" width="w-20" />
        <GhostLine className="mt-2 h-6" inPulse look="loading" width="w-3/5" />
        <GhostLine className="mt-2 h-5" inPulse look="loading" width="w-4/5" />
        <GhostLine className="mt-3 h-6" inPulse look="loading" width="w-2/3" />
      </span>
    </span>
  );
}

/** The recommendation tile's place (`Spotlight`'s exact size) */
export function SpotlightSkeleton({
  look = 'loading',
  title = 'The recommendation',
}: Readonly<{
  look?: PlaceholderLook;
  /** failed: what the card says didn't load */
  title?: string;
}>) {
  const classes = cn('block h-75 rounded-16 md:h-110', GHOST_LOOK[look]);
  const tile = <span aria-hidden className={classes} />;
  if (look === 'loading') {
    return <SpotlightGhost />;
  }
  // The failed look: the dashed tile under the "didn't load" card
  return (
    <div className="relative [--row-end:0px] [--row-start:0px]">
      {tile}
      <RowErrorCard state="unavailable" title={title} />
    </div>
  );
}

type HeroSkeletonProps = DetailsSkeletonProps &
  Readonly<{
    /** with a recommendation tile (Theme, Network) */
    aside?: boolean;
    /** the real crumb: it is static, so the shell already says where you are */
    crumb: ReactNode;
    glow?: string;
  }>;

/**
 * The whole hero before the slug is known (the shell of a slug that wasn't
 * prerendered): the real crumb, a bar for the title, then
 * `LandingHeroDetailsSkeleton` and the tile (`aside`).
 */
export function LandingHeroSkeleton({
  aside = false,
  crumb,
  glow,
  line = true,
  ...details
}: HeroSkeletonProps) {
  const tile = aside ? <SpotlightSkeleton /> : undefined;
  return (
    <LandingHero
      aside={tile}
      glow={glow}
      labelledBy="landing-loading"
      placeholder
    >
      {crumb}
      <h1 className="sr-only" id="landing-loading">
        Loading
      </h1>
      {/* the title's line box (display: 48 / 64px) with the bar centred in it, as the glyphs sit in theirs, so the crumb keeps its distance */}
      <span
        aria-hidden
        className={cn('flex h-12 items-center md:h-16', TITLE_SPACE)}
        data-placeholder="landing-title"
      >
        <span
          className={`${bar('loading')} h-9 w-56 md:h-12 md:w-80`}
          data-placeholder="landing-title-bar"
        />
      </span>
      <LandingHeroDetailsSkeleton line={line} {...details} />
    </LandingHero>
  );
}

/**
 * A `PlainHeroFrame`'s heading while the slug resolves: the h1 the frame
 * is labelled by, the title's place and the meta line's; `children` add
 * what the heading draws under them.
 */
export function PlainHeadingSkeleton({
  children,
  id,
}: Readonly<{
  children?: ReactNode;
  /** the frame's `labelledBy` */
  id: string;
}>) {
  return (
    <>
      <h1 className="sr-only" id={id}>
        Loading
      </h1>
      <span
        aria-hidden
        className={cn(
          'block h-12 w-40 rounded-8 md:h-16 md:w-56',
          GHOST_FILL,
          TITLE_SPACE,
        )}
      />
      <span
        aria-hidden
        className={cn('mt-2 block h-5 w-64 rounded-8', GHOST_FILL)}
      />
      {children}
    </>
  );
}

type SectionProps = Readonly<{
  /** the slots, at the loaded section's size */
  children: ReactNode;
  look: PlaceholderLook;
  /** the heading's own classes, where the loaded heading is not the plain title (the wall's 32px line) */
  headingClass?: string;
  /** the parity checks' name (`data-placeholder`) */
  name?: string;
  /** without one the title comes with the data: a bar in its line */
  title?: string;
}>;

/**
 * A section that isn't a poster row, before it has its data: its title over
 * slots of the loaded size. Loading, the region is busy; failed (the data
 * is `Unavailable`), the error card over the slots says it didn't load,
 * with Try again (it refreshes the route).
 */
export function SectionPlaceholder({
  children,
  headingClass,
  look,
  name,
  title,
}: SectionProps) {
  const heading = (
    <h2 className={cn('mb-6 text-title-2 text-white', headingClass)}>
      {title ?? <TitleGhost />}
    </h2>
  );
  if (look === 'loading') {
    return (
      <section aria-busy className={PAGE_COLUMN} data-placeholder={name}>
        {heading}
        {children}
      </section>
    );
  }
  return (
    <section className={PAGE_COLUMN}>
      {heading}
      <div className="relative [--row-end:0px] [--row-start:0px]">
        {children}
        <RowErrorCard state="unavailable" title={title ?? ''} />
      </div>
    </section>
  );
}

/**
 * Where to start's place: the title (a bar when it comes with the data) and
 * the cards: three across from lg (the column is too narrow for three below it), stacked before.
 * The section is only drawn with three cards (`MIN_POSTERS`, a slot
 * shown above is filled from its backups), so all three stack on a phone.
 */
export function WhereToStartSkeleton({
  look = 'loading',
  phone = 'cards',
  title,
}: Readonly<{
  look?: PlaceholderLook;
  /** as `WhereToStart`: on a phone every pick a card, or the first a card and the others a swipe row of posters (country) */
  phone?: 'cards' | 'first-card';
  title?: string;
}>) {
  const card = cn('block h-37 rounded-16 md:h-48', GHOST_LOOK[look]);
  return (
    <SectionPlaceholder
      look={look}
      name="start"
      title={title ?? (look === 'failed' ? 'Where to start' : undefined)}
    >
      <div className="flex flex-col gap-3 md:gap-6 lg:grid lg:grid-cols-3">
        {[0, 1, 2].map((index) => {
          const hidden = phone === 'first-card' && index > 0 && 'max-lg:hidden';
          return look === 'loading' ? (
            <StartCardGhost className={hidden || undefined} key={index} />
          ) : (
            <span aria-hidden className={cn(card, hidden)} key={index} />
          );
        })}
      </div>
      {phone === 'first-card' ? (
        <div
          aria-hidden
          className={cn(
            'mt-4 flex gap-3 overflow-hidden lg:hidden [--tile-radius:10px]',
            look === 'loading' && 'animate-ghost',
          )}
        >
          {[0, 1, 2].map((index) => (
            <span
              className={cn(
                'block aspect-2/3 w-35 shrink-0 rounded-10',
                look === 'loading' ? GHOST_FILL : GHOST_LOOK.failed,
              )}
              key={index}
            />
          ))}
        </div>
      ) : null}
    </SectionPlaceholder>
  );
}

/** One row of the ranked list as it is drawn (`RankedItem`): the rank, the title line, the facts line */
function RankedRowGhost({
  compact,
  look,
}: Readonly<{ compact?: boolean; look: PlaceholderLook }>) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid items-center rounded-12',
        compact
          ? 'grid-cols-[32px_minmax(0,1fr)_auto] gap-3 px-2 py-2.5'
          : 'grid-cols-[48px_minmax(0,1fr)_auto] gap-4 px-4 py-3',
      )}
    >
      <GhostLine
        className={compact ? 'h-6' : 'h-7'}
        look={look}
        width="ml-auto w-4"
      />
      <span className="flex min-w-0 flex-col gap-1 md:gap-2">
        <GhostLine
          className={compact ? 'h-6' : 'h-7'}
          look={look}
          width="w-3/5"
        />
        <GhostLine className="h-5" look={look} width="w-2/5" />
      </span>
      <span />
    </span>
  );
}

/**
 * The ranked list's place: the title and the rows as drawn (ten in two
 * columns of five on desktop; five and a "Show 6 to 10" button on a phone).
 */
export function RankedListSkeleton({
  look = 'loading',
  title,
}: Readonly<{ look?: PlaceholderLook; title?: string }>) {
  return (
    <SectionPlaceholder look={look} name="ranked" title={title}>
      <div>
        <div className="grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-12 gap-y-1 max-md:hidden">
          {Array.from({ length: 10 }, (_, index) => (
            <RankedRowGhost key={index} look={look} />
          ))}
        </div>
        <div className="-mx-2 flex flex-col items-start gap-4 md:hidden">
          <div className="flex w-full flex-col gap-0.5">
            {Array.from({ length: 5 }, (_, index) => (
              <RankedRowGhost compact key={index} look={look} />
            ))}
          </div>
          <span
            aria-hidden
            className={cn(
              'mx-2 block h-10 w-44 rounded-full',
              GHOST_LOOK[look],
            )}
          />
        </div>
      </div>
    </SectionPlaceholder>
  );
}
