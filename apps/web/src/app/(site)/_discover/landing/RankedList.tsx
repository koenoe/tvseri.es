'use client';

import { AnimatePresence } from 'motion/react';
import { useCallback, useState } from 'react';
import FoldPresence from '@/components/motion/FoldPresence';
import { LATE_FADE } from '@/components/motion/lateFade';
import PageSlide from '@/components/motion/PageSlide';
import Button from '@/components/ui/button/Button';
import {
  calendarGlyph,
  chevronDownGlyph,
  chevronLeftGlyph,
  chevronRightGlyph,
  starGlyph,
  variantTvGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';
import ArrowButton from '@/components/ui/row/ArrowButton';
import TileLink from '@/components/ui/tile/TileLink';
import WatchedLabel from '@/components/ui/tile/WatchedLabel';
import cn from '@/lib/cn';
import { useIsWatched } from '@/lib/marking/useWatched';
import showPath from '@/lib/routing/showPath';
import {
  RANKED_COLUMNS,
  RANKED_PHONE,
  RANKED_PHONE_ROWS,
  RANKED_PHONE_SPACE,
  RANKED_ROW,
  rankedPage,
  showMoreLabel,
} from './ranked';
import SeenNote from './SeenNote';

export type RankedShow = Readonly<{
  id: number;
  slug: string;
  title: string;
  year: number | null;
  network: string | null;
}>;

/** Desktop: 10 a page in two columns of 5 */
const PAGE = 10;
/** Phone: 5 more at a time */
const STEP = 5;

/** The Watched label's cell: a flex box, so the label sits as it would alone */
const LABEL_CELL = cn('flex', LATE_FADE);

type Props = Readonly<{
  id: string;
  items: ReadonlyArray<RankedShow>;
  /** "Highest rated on TMDB, 1,000+ votes" (with a star) */
  subtitle: string;
  title: string;
}>;

/** The desktop page and the way the last arrow travelled (1 next, -1 back) */
const FIRST_PAGE = { direction: 0, page: 0 } as const;

/** The pages' place: the page leaving slides out over it (`PageSlide`) */
const PAGES = 'relative max-md:hidden';

/**
 * "The 50 best": a bounded ranked list, 10 a page with the row
 * arrows and "1–10 of 50" on desktop; 5 at a time on a phone with "Show 6
 * to 10 of 50" until the last. Every show is already here: a page slides
 * in the way the arrow points, as the calendar's months do (`PageSlide`),
 * and Show more folds the next five in (`FoldPresence`). Rank, title,
 * year and network; the Watched label at the end once the viewer's marks
 * are in.
 */
export default function RankedList({ id, items, subtitle, title }: Props) {
  const [{ direction, page }, setView] =
    useState<Readonly<{ direction: number; page: number }>>(FIRST_PAGE);
  const [shown, setShown] = useState(STEP);

  const titleId = `${id}-title`;
  const listId = `${id}-list`;
  const current = rankedPage(items, page, PAGE);
  const phone = rankedPage(items.slice(0, shown), 0, shown);
  const more = showMoreLabel(shown, items.length, STEP);
  const pageIds = current.items.map(({ item }) => item.id);

  const previous = useCallback(
    () =>
      setView((value) => ({
        direction: -1,
        page: Math.max(0, value.page - 1),
      })),
    [],
  );
  const next = useCallback(
    () => setView((value) => ({ direction: 1, page: value.page + 1 })),
    [],
  );
  const showMore = useCallback(() => setShown((value) => value + STEP), []);

  if (items.length === 0) {
    return null;
  }
  const previousLabel = `Previous: ${title}`;
  const nextLabel = `Next: ${title}`;

  return (
    <section
      aria-labelledby={titleId}
      className={PAGE_COLUMN}
      data-slot="ranked"
    >
      <div className="mb-6 flex items-center gap-2.5 md:gap-5">
        <h2 className="min-w-0 truncate text-title-2 text-white" id={titleId}>
          {title}
        </h2>
        <span className="flex shrink-0 items-center gap-1.5 text-body-sm text-white/60 max-md:hidden">
          <Icon glyph={starGlyph} size={13} />
          {subtitle}
        </span>
        <span
          aria-live="polite"
          className="shrink-0 text-body-sm text-white/60 tabular-nums max-md:hidden"
        >
          {current.range}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-white/60 max-md:hidden">
          <SeenNote ids={pageIds} />
        </span>
        <span className="-my-1.5 ml-auto flex shrink-0 items-center gap-2 max-md:hidden">
          <ArrowButton
            controls={listId}
            disabled={current.atStart}
            glyph={chevronLeftGlyph}
            label={previousLabel}
            onPage={previous}
          />
          <ArrowButton
            controls={listId}
            disabled={current.atEnd}
            glyph={chevronRightGlyph}
            label={nextLabel}
            onPage={next}
          />
        </span>
      </div>
      <div className={PAGES} id={listId}>
        <PageSlide
          as="ol"
          className={RANKED_COLUMNS}
          direction={direction}
          pageKey={current.range}
        >
          {current.items.map(({ item, rank }) => (
            <li key={item.id}>
              <RankedItem rank={rank} show={item} />
            </li>
          ))}
        </PageSlide>
      </div>
      <div className={RANKED_PHONE}>
        <ol className={RANKED_PHONE_ROWS}>
          <AnimatePresence initial={false}>
            {phone.items.map(({ item, rank }) => (
              <FoldPresence as="li" key={item.id}>
                <div className={rank > 1 ? RANKED_PHONE_SPACE : undefined}>
                  <RankedItem compact rank={rank} show={item} />
                </div>
              </FoldPresence>
            ))}
          </AnimatePresence>
        </ol>
        {more ? (
          <Button
            className="mx-2"
            onClick={showMore}
            trailingIcon={chevronDownGlyph}
            variant="outline"
          >
            {more}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function RankedItem({
  compact = false,
  rank,
  show,
}: Readonly<{
  compact?: boolean;
  rank: number;
  show: RankedShow;
}>) {
  const watched = useIsWatched(show.id);
  const href = showPath(show.id, show.slug);
  const label = `${rank}. ${show.title}${watched ? ', watched' : ''}`;
  const rowClass = compact
    ? `${RANKED_ROW.compact} transition-colors hover:bg-white/5`
    : `${RANKED_ROW.full} transition-colors duration-200 hover:bg-white/5`;
  return (
    <TileLink aria-label={label} className={rowClass} href={href}>
      <span className="text-right text-title-3 text-white/60 tabular-nums">
        {rank}
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={
            compact
              ? 'truncate text-body-sm font-semibold text-white'
              : 'truncate text-body font-semibold text-white'
          }
        >
          {show.title}
        </span>
        <MetaRow className={compact ? 'mt-1' : 'mt-2'}>
          <MetaItem icon={calendarGlyph}>{show.year ?? undefined}</MetaItem>
          <MetaItem icon={variantTvGlyph} shrink>
            {show.network ?? undefined}
          </MetaItem>
        </MetaRow>
      </span>
      {watched ? (
        <span className={LABEL_CELL}>
          <WatchedLabel />
        </span>
      ) : (
        <span />
      )}
    </TileLink>
  );
}
