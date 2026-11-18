'use client';

import type { LibraryCounts, LibraryShelf } from '@tvseri.es/schemas';
import { LIBRARY_SHELVES } from '@tvseri.es/schemas';
import { formatGrouped } from '@tvseri.es/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useRef } from 'react';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { libraryPath } from '@/lib/routing/profilePath';
import { useShelfCounts } from '../../_lib/shelfCounts';
import { SHELVES } from '../_lib/shelves';
import { usePillGlide } from '../_lib/usePillGlide';
import { NavRule, ROW, ShelvesHeading } from './shelfNavParts';
import { SHELF_CHIP } from './toolbarStyles';

type Props = Readonly<{
  counts: LibraryCounts | null;
  /** `/library`'s shelf: active there */
  defaultShelf: LibraryShelf;
  owner: boolean;
  username: string;
}>;

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
  const nav = useRef<HTMLElement>(null);
  const onPick = usePillGlide(nav, active);
  return (
    <nav aria-label="Shelves" className="flex flex-col gap-0.5" ref={nav}>
      <ShelvesHeading />
      {shelvesFor(owner, live, active).map((shelf) => (
        <Fragment key={shelf}>
          {shelf === 'all' ? <NavRule /> : null}
          <ShelfRow
            active={shelf === active}
            count={live?.[shelf] ?? null}
            onPick={onPick}
            shelf={shelf}
            username={username}
          />
        </Fragment>
      ))}
    </nav>
  );
}

// contrast-exempt: an empty shelf (disabled, not a link)
const EMPTY_ROW = cn(ROW, 'text-white/40');

function ShelfRow({
  active,
  count,
  onPick,
  shelf,
  username,
}: Readonly<{
  active: boolean;
  count: number | null;
  onPick: () => void;
  shelf: LibraryShelf;
  username: string;
}>) {
  const meta = SHELVES[shelf];
  const empty = count === 0 && !active;
  const iconClass = cn('relative', active ? 'text-white' : 'text-white/60');
  const countClass = cn(
    'relative ml-auto tabular-nums',
    active ? 'text-white' : 'text-white/60',
  );
  const content = (
    <>
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-8 bg-white/10"
          data-pill
        />
      ) : null}
      <Icon className={iconClass} glyph={meta.glyph} size={16} />
      <span className="relative">{meta.label}</span>
      <span className={countClass}>
        {count === null ? '' : formatGrouped(count)}
      </span>
    </>
  );
  if (empty) {
    return <span className={EMPTY_ROW}>{content}</span>;
  }
  const href = libraryPath(username, shelf);
  const rowClass = cn(
    ROW,
    active
      ? 'text-white'
      : 'text-white/80 transition-colors hover:bg-white/5 hover:text-white',
  );
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={rowClass}
      href={href}
      onClick={onPick}
    >
      {content}
    </Link>
  );
}

// contrast-exempt: an empty shelf chip (disabled, not a link)
const EMPTY_CHIP = cn(SHELF_CHIP, 'bg-white/6 text-white/35');

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
        const chipCountClass = cn(
          'tabular-nums',
          on ? 'text-[rgb(23_23_23/0.6)]' : 'text-white/60',
        );
        const label = (
          <>
            {SHELVES[shelf].chip}
            <span className={chipCountClass}>
              {count === null ? '' : formatGrouped(count)}
            </span>
          </>
        );
        if (count === 0 && !on) {
          return (
            <span className={EMPTY_CHIP} key={shelf}>
              {label}
            </span>
          );
        }
        const href = libraryPath(username, shelf);
        const chipClass = cn(
          SHELF_CHIP,
          on ? 'bg-white text-[#171717]' : 'bg-white/6 text-white/80',
        );
        return (
          <Link
            aria-current={on ? 'page' : undefined}
            className={chipClass}
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
