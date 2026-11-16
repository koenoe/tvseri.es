import Link from 'next/link';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { calendarGlyph, eyeGlyph } from '@/components/ui/icon/glyphs';
import Handle from '@/components/ui/identity/Handle';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { plural } from '@/lib/format/text';
import profilePath from '@/lib/routing/profilePath';
import statsPath from '@/lib/routing/statsPath';
import { getProfileCounts, isUnavailable } from '../../_data/loaders';
import type { SectionProps } from '../types';
import StatsUnavailable from '../ui/StatsUnavailable';
import { visiblePills } from './model';
import { pillStyles } from './pillStyles';
import Sparkline from './Sparkline';
import YearsList from './YearsList';
import YearsSheet from './YearsSheet';
import { loadYearRows, type YearRow } from './years';

/** Scrolls with the page (no sticky bars under the sticky glass header) */
const YEARS_CLASSES = '-mx-gutter mt-3 overflow-hidden px-gutter pt-3.5 pb-2.5';

/** Pills that fit beside "More" at 390px ("2026 so far" is the widest) */
const FIT = 3;

/**
 * The phone's identity and years (STMobile): a short header (the handle, one
 * meta line) and the Years pill row, the page's year
 * filled white. "More" opens the full list in a bottom sheet (more than one
 * year).
 */
export default async function PhoneHead({ user, year }: SectionProps) {
  const [counts, rows] = await Promise.all([
    getProfileCounts(user.id),
    loadYearRows(user.id),
  ]);
  if (isUnavailable(counts) || isUnavailable(rows)) {
    return (
      <StatsUnavailable
        id="stats-phone-head"
        placeholder={<PhoneHeadSkeleton />}
        title={`@${user.username}`}
      />
    );
  }
  const episodes = plural(counts.episodes, 'episode');
  const joinedText = `Member since ${user.memberSince}`;
  const profileHref = profilePath(user.username);
  const { more, years } = visiblePills(
    rows.map((row) => row.year),
    year,
    FIT,
  );
  const pills = rows.filter((row) => years.includes(row.year));
  return (
    <>
      <section
        aria-label={`About ${user.username}`}
        className="flex flex-col gap-3 pt-0.5"
      >
        {/* a container, so the handle fits its size to the column */}
        <div className="@container flex flex-col gap-2">
          <Handle
            as="p"
            href={profileHref}
            size="compact"
            username={user.username}
          />
          <MetaRow>
            <MetaItem icon={calendarGlyph}>{joinedText}</MetaItem>
            <MetaItem icon={eyeGlyph}>{episodes}</MetaItem>
          </MetaRow>
        </div>
      </section>
      <nav aria-label="Years" className={YEARS_CLASSES}>
        <ul className="flex gap-1.5">
          {pills.map((row) => (
            <li key={row.year}>
              <Pill
                row={row}
                selected={row.year === year}
                username={user.username}
              />
            </li>
          ))}
          {more ? (
            <li>
              <YearsSheet>
                <YearsList
                  rows={rows}
                  selected={year}
                  username={user.username}
                />
              </YearsSheet>
            </li>
          ) : null}
        </ul>
      </nav>
    </>
  );
}

function Pill({
  row,
  selected,
  username,
}: Readonly<{ row: YearRow; selected: boolean; username: string }>) {
  const href = statsPath(username, row.year);
  const classes = pillStyles(selected);
  return (
    <Link
      aria-current={selected ? 'page' : undefined}
      className={classes}
      href={href}
    >
      <span>{row.label}</span>
      <Sparkline
        currentWeek={row.currentWeek}
        size="pill"
        values={row.values}
      />
    </Link>
  );
}

/** The Years pills */
const PILL_GHOSTS = [0, 1, 2];

/**
 * The header's size while it loads (a phone's and, below lg, a tablet's):
 * the identity, then the pill row
 */
export function PhoneHeadSkeleton() {
  return (
    <>
      <div aria-hidden className="flex animate-ghost flex-col gap-3 pt-0.5">
        <div className="flex flex-col gap-2">
          <Ghost className="h-10 w-36 rounded-8" />
          <TextLine className="text-meta" width="w-56" />
        </div>
      </div>
      <div
        aria-hidden
        className="mt-3 flex h-[58px] animate-ghost gap-2 px-0 pt-3.5 pb-2.5"
      >
        {PILL_GHOSTS.map((n) => (
          <Ghost className="h-[34px] w-20 rounded-full" key={n} />
        ))}
      </div>
    </>
  );
}
