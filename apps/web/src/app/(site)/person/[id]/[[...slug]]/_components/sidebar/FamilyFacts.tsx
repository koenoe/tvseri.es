import Link from 'next/link';
import { Fragment } from 'react';
import { PULSE } from '@/components/ui/ghost/ghosts';
import {
  awardGlyph,
  clockGlyph,
  heartGlyph,
  userGlyph,
} from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import { formatMonthDay } from '@/lib/person/format';
import { loadFamilyAndAwards, loadShows } from '@/lib/person/loaders';
import { awardsLine } from '../../_lib/awards';
import { childrenLine, spouseLine } from '../../_lib/family';
import Fact, { FACTS } from './Fact';

/** "Next: Tightrope!, in development" or "Next: X, premieres Jun 12" */
async function nextLine(id: number, died: boolean) {
  if (died) {
    return undefined;
  }
  const shows = await loadShows(id);
  const next = shows && !isUnavailable(shows) ? shows.upcoming[0] : undefined;
  if (!next) {
    return undefined;
  }
  const when =
    next.upcoming?.state === 'dated' && next.upcoming.date
      ? `premieres ${formatMonthDay(next.upcoming.date)}`
      : 'in development';
  return `Next: ${next.name}, ${when}`;
}

/** A spouse or child with their own person page */
function FamilyLink({ href, name }: Readonly<{ href: string; name: string }>) {
  return (
    <Link className="text-white hover:text-[#d4d4d4]" href={href}>
      {name}
    </Link>
  );
}

const FACTS_GHOST = `${FACTS} max-lg:gap-2.5 ${PULSE}`;
const ICON_GHOST = cn(
  'size-[13px] shrink-0 rounded-full lg:size-[15px]',
  GHOST_FILL,
);
const LINE_GHOST = cn('h-3 rounded-4', GHOST_FILL);

/**
 * The block's space while it loads, at its most common count: three lines
 * on desktop, two below lg, where "Next" is not drawn (a sample of popular
 * TV actors: 0 to 4 lines, no count right for more than about 40% of
 * people). Only seen while a person's page is generated for the first time:
 * the cached shell carries the real block. No space is reserved for more,
 * which would leave most people a blank gap for good. It is the sidebar's
 * last block above the viewer's line; on desktop the sidebar is sticky.
 */
export function FamilyFactsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={FACTS_GHOST}
      data-placeholder="person-family"
    >
      {[0, 1, 2].map((line) => {
        const lineClass = cn(
          'flex h-6 items-center gap-2 lg:gap-2.5',
          line === 2 && 'max-lg:hidden',
        );
        const barClass = cn(LINE_GHOST, line === 1 ? 'w-40' : 'w-52');
        return (
          <span className={lineClass} key={line}>
            <span className={ICON_GHOST} />
            <span className={barClass} />
          </span>
        );
      })}
    </div>
  );
}

/**
 * The sidebar's family, awards and Next lines (Wikidata). Each line is left out when there is nothing to say; with none the
 * block is absent.
 */
export default async function FamilyFacts({
  died,
  id,
}: Readonly<{ died: boolean; id: number }>) {
  const [data, next] = await Promise.all([
    loadFamilyAndAwards(id),
    nextLine(id, died),
  ]);
  const known = isUnavailable(data) ? { awards: null, family: null } : data;
  const spouse = spouseLine(known.family);
  const children = childrenLine(known.family);
  const awards = awardsLine(known.awards);

  if (!spouse && !children && !awards && !next) {
    return null;
  }

  return (
    <div
      aria-label="Family and awards"
      className={`${FACTS} max-lg:gap-2.5`}
      data-slot="person-family"
      role="group"
    >
      {spouse ? (
        <Fact icon={heartGlyph}>
          Married to{' '}
          {spouse.spouse.href ? (
            <FamilyLink href={spouse.spouse.href} name={spouse.spouse.name} />
          ) : (
            spouse.spouse.name
          )}
          {spouse.years}
        </Fact>
      ) : null}
      {children ? (
        <Fact icon={userGlyph}>
          {children.label}{' '}
          {children.people.map((child, index) => (
            <Fragment key={child.name}>
              {index > 0
                ? index === children.people.length - 1
                  ? ' and '
                  : ', '
                : null}
              {child.href ? (
                <FamilyLink href={child.href} name={child.name} />
              ) : (
                <span className="text-white">{child.name}</span>
              )}
            </Fragment>
          ))}
        </Fact>
      ) : null}
      {awards ? (
        <a className="hover:text-[#d4d4d4]" href="#awards">
          <Fact icon={awardGlyph}>{awards}</Fact>
        </a>
      ) : null}
      {next ? (
        <Fact className="max-lg:hidden" icon={clockGlyph}>
          {next}
        </Fact>
      ) : null}
    </div>
  );
}
