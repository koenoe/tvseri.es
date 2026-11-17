import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { calendarGlyph, eyeGlyph } from '@/components/ui/icon/glyphs';
import Handle from '@/components/ui/identity/Handle';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { plural } from '@/lib/format/text';
import profilePath from '@/lib/routing/profilePath';
import statsPath from '@/lib/routing/statsPath';
import StatsUnavailable from '../../[year]/_components/ui/StatsUnavailable';
import { isUnavailable } from '../../[year]/_data/loaders';
import { loadStatsHead, type StatsHeadParams } from './head';
import { pillStyles } from './pillStyles';
import Sparkline from './Sparkline';
import YearLink from './YearLink';
import YearPills from './YearPills';
import YearsList from './YearsList';
import YearsSheet from './YearsSheet';
import type { YearRow } from './years';

/** Scrolls with the page (no sticky bars under the sticky glass header) */
const YEARS_CLASSES = '-mx-gutter mt-3 overflow-hidden px-gutter pt-3.5 pb-4';

/**
 * The phone's identity and years (in the Stats layout, so a year switch
 * keeps it): a short header (the handle, one meta line) and the Years pill
 * row, the URL's year filled white (`YearPills`). "More" opens the full list
 * in a bottom sheet (more than one year).
 */
export default async function PhoneHead({
  params,
}: Readonly<{ params: StatsHeadParams }>) {
  const head = await loadStatsHead(params);
  if (!head) {
    return null;
  }
  const { counts, rows, user } = head;
  if (isUnavailable(counts) || isUnavailable(rows)) {
    return (
      <StatsUnavailable
        placeholder={<PhoneHeadSkeleton />}
        title={`@${user.username}`}
      />
    );
  }
  const episodes = plural(counts.episodes, 'episode');
  const profileHref = profilePath(user.username);
  const pills = rows.map((row) => ({
    pill: <Pill row={row} username={user.username} />,
    year: row.year,
  }));
  const more = (
    <YearsSheet>
      <YearsList rows={rows} username={user.username} />
    </YearsSheet>
  );
  return (
    <div data-slot="stats-phone-head">
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
            {user.memberSince ? (
              <MetaItem icon={calendarGlyph}>
                Member since {user.memberSince}
              </MetaItem>
            ) : null}
            <MetaItem icon={eyeGlyph}>{episodes}</MetaItem>
          </MetaRow>
        </div>
      </section>
      <nav aria-label="Years" className={YEARS_CLASSES}>
        <YearPills more={more} pills={pills} />
      </nav>
    </div>
  );
}

const PILL = pillStyles();
const SELECTED_PILL = pillStyles(true);

function Pill({ row, username }: Readonly<{ row: YearRow; username: string }>) {
  const href = statsPath(username, row.year);
  return (
    <YearLink
      className={PILL}
      href={href}
      selectedClassName={SELECTED_PILL}
      year={row.year}
    >
      <span>{row.label}</span>
      <Sparkline
        currentWeek={row.currentWeek}
        size="pill"
        values={row.values}
      />
    </YearLink>
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
    <div data-placeholder="stats-phone-head">
      <div aria-hidden className="flex animate-ghost flex-col gap-3 pt-0.5">
        <div className="flex flex-col gap-2">
          <Ghost className="h-10 w-36 rounded-8" />
          <TextLine className="text-meta" width="w-56" />
        </div>
      </div>
      <div
        aria-hidden
        className="mt-3 flex h-16 animate-ghost gap-2 px-0 pt-3.5 pb-4"
      >
        {PILL_GHOSTS.map((n) => (
          <Ghost className="h-[34px] w-20 rounded-full" key={n} />
        ))}
      </div>
    </div>
  );
}
