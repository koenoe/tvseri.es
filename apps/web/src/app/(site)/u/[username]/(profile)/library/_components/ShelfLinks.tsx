'use client';

import type { LibraryCounts, LibraryShelf } from '@tvseri.es/schemas';
import { LIBRARY_SHELVES } from '@tvseri.es/schemas';
import * as m from 'motion/react-m';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import MaxMotion from '@/components/motion/MaxMotion';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { formatGrouped } from '@/lib/formatCount';
import { libraryPath } from '@/lib/routing/profilePath';
import { useShelfCounts } from '../_lib/counts';
import { SHELVES } from '../_lib/shelves';
import { NavRule, ROW, ShelvesHeading } from './shelfNavParts';

type Props = Readonly<{
  counts: LibraryCounts | null;
  /** `/library`'s shelf: active there */
  defaultShelf: LibraryShelf;
  owner: boolean;
  username: string;
}>;

/** The active row's pill moves to the new row (FLIP) */
const PILL = { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] } as const;

/**
 * The shelves this viewer sees: Hidden only for the owner, and not at 0
 * unless it is the shelf on screen (it stays, highlighted, when its last
 * series is brought back)
 */
function shelvesFor(
  owner: boolean,
  counts: LibraryCounts | null,
  active: LibraryShelf,
) {
  return LIBRARY_SHELVES.filter(
    (shelf) =>
      shelf !== 'hidden' ||
      (owner && ((counts?.hidden ?? 0) > 0 || active === 'hidden')),
  );
}

function useActiveShelf(defaultShelf: LibraryShelf): LibraryShelf {
  const pathname = usePathname();
  const last = pathname.split('/').at(-1);
  return LIBRARY_SHELVES.find((shelf) => shelf === last) ?? defaultShelf;
}

/**
 * The sidebar's shelf navigator: "Shelves · a show can
 * sit on two", a row per shelf with its count, a rule before All shows. A
 * shelf at 0 is dimmed and not a link. Counts follow this page's changes.
 */
export function ShelfNav({ counts, defaultShelf, owner, username }: Props) {
  const live = useShelfCounts(username, counts);
  const active = useActiveShelf(defaultShelf);
  return (
    <MaxMotion>
      <nav aria-label="Shelves" className="flex flex-col gap-0.5">
        <ShelvesHeading />
        {shelvesFor(owner, live, active).map((shelf) => (
          <Fragment key={shelf}>
            {shelf === 'all' ? <NavRule /> : null}
            <ShelfRow
              active={shelf === active}
              count={live?.[shelf] ?? null}
              shelf={shelf}
              username={username}
            />
          </Fragment>
        ))}
      </nav>
    </MaxMotion>
  );
}

function ShelfRow({
  active,
  count,
  shelf,
  username,
}: Readonly<{
  active: boolean;
  count: number | null;
  shelf: LibraryShelf;
  username: string;
}>) {
  const meta = SHELVES[shelf];
  const empty = count === 0 && !active;
  const content = (
    <>
      {active ? (
        <m.span
          aria-hidden="true"
          className="absolute inset-0 rounded-8 bg-white/10"
          layoutId="shelf-row"
          transition={PILL}
        />
      ) : null}
      <Icon
        className={cn('relative', active ? 'text-white' : 'text-white/60')}
        glyph={meta.glyph}
        size={16}
      />
      <span className="relative">{meta.label}</span>
      <span
        className={cn(
          'relative ml-auto tabular-nums',
          active ? 'text-white' : 'text-white/60',
        )}
      >
        {count === null ? '' : formatGrouped(count)}
      </span>
    </>
  );
  if (empty) {
    // contrast-exempt: an empty shelf (disabled, not a link)
    return <span className={cn(ROW, 'text-white/40')}>{content}</span>;
  }
  const href = libraryPath(username, shelf);
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        ROW,
        active
          ? 'text-white'
          : 'text-white/80 transition-colors hover:bg-white/5 hover:text-white',
      )}
      href={href}
    >
      {content}
    </Link>
  );
}

const CHIP =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] leading-5 font-medium whitespace-nowrap';

/**
 * The phone's shelves: one row of chips under the
 * tabs, scrolling sideways; the active one white, one at 0 dimmed and not a
 * link.
 */
export function ShelfChips({ counts, defaultShelf, owner, username }: Props) {
  const live = useShelfCounts(username, counts);
  const active = useActiveShelf(defaultShelf);
  return (
    <nav
      aria-label="Shelves"
      className="-mx-gutter flex gap-2 overflow-x-auto px-gutter [scrollbar-width:none]"
    >
      {shelvesFor(owner, live, active).map((shelf) => {
        const count = live?.[shelf] ?? null;
        const on = shelf === active;
        const label = (
          <>
            {SHELVES[shelf].chip}
            <span
              className={cn(
                'tabular-nums',
                on ? 'text-[rgb(23_23_23/0.6)]' : 'text-white/60',
              )}
            >
              {count === null ? '' : formatGrouped(count)}
            </span>
          </>
        );
        if (count === 0 && !on) {
          return (
            // contrast-exempt: an empty shelf chip (disabled, not a link)
            <span className={cn(CHIP, 'bg-white/6 text-white/35')} key={shelf}>
              {label}
            </span>
          );
        }
        const href = libraryPath(username, shelf);
        return (
          <Link
            aria-current={on ? 'page' : undefined}
            className={cn(
              CHIP,
              on ? 'bg-white text-[#171717]' : 'bg-white/6 text-white/80',
            )}
            href={href}
            key={shelf}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
