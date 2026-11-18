import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { isUnavailable, tryApi } from '@/lib/cache/unavailable';
import { readCount } from '@/lib/profile/counts';
import { parseMonthKey } from '@/lib/profile/diary';
import { loadHistoryStart } from '@/lib/profile/history';
import Hole from '../_components/blocks/Hole';
import EpisodesCount from '../_components/shell/EpisodesCount';
import SubpageHeader, {
  SUBPAGE_TITLE_ID,
} from '../_components/subpage/SubpageHeader';
import {
  getProfile,
  getProfileOrNull,
  type ProfileParams,
  profileMetadata,
  withToken,
} from '../_data/profile';
import Diary from './_components/Diary';
import DiaryEnd from './_components/DiaryEnd';
import DiarySkeleton from './_components/DiarySkeleton';
import HistoryDayZero from './_components/HistoryDayZero';

type SearchParams = Promise<
  Readonly<Record<string, string | string[] | undefined>>
>;
type Props = Readonly<{ params: ProfileParams; searchParams: SearchParams }>;

/** SubpageHeader's description line (13/20, white/60) */
const DESCRIPTION = 'text-meta text-white/60';
const DESCRIPTION_GHOST = `block h-3 w-80 rounded-6 ${GHOST_FILL} ${PULSE}`;
const COUNT_GHOST = `inline-block h-3 w-24 rounded-6 ${GHOST_FILL} ${PULSE}`;

const OWNER_DESCRIPTION =
  'Everything you watched, by day, newest first. One row is one series on one day.';

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata(params, (username) => `@${username}’s history`);
}

/**
 * History: the only place that lists everything someone watched, by day.
 * The header and the frame are the static shell; the count, a visitor's
 * description and the diary stream in. `?month=` opens the diary at that
 * month (a jump). The phone frame has no header.
 */
export default function HistoryPage({ params, searchParams }: Props) {
  const count = (
    <Suspense fallback={<CountGhost />}>
      <HistoryCount params={params} />
    </Suspense>
  );
  const description = (
    <OwnerVisitor
      owner={<p className={DESCRIPTION}>{OWNER_DESCRIPTION}</p>}
      visitor={
        <Suspense
          fallback={
            <span className="block h-5 py-1">
              <span className={DESCRIPTION_GHOST} />
            </span>
          }
        >
          <VisitorDescription params={params} />
        </Suspense>
      }
    />
  );
  return (
    <section aria-labelledby={SUBPAGE_TITLE_ID} className="flex flex-col gap-4">
      {/* the description is the page's own: a visitor's names them (streamed) */}
      <div className="flex flex-col gap-2 max-md:hidden">
        <SubpageHeader count={count} title="History" />
        {description}
      </div>
      <Hole bare fallback={<DiarySkeleton />} title="History">
        <History params={params} searchParams={searchParams} />
      </Hole>
    </section>
  );
}

function CountGhost() {
  return <span className={COUNT_GHOST} />;
}

/**
 * "4,718 episodes": every episode marked watched, undated ones included
 * (they "count in your totals", as the diary's end says). The sidebar's
 * count on the same screen, from the same counter (`readCount`), so the
 * two never disagree; nothing on day 0.
 */
async function HistoryCount({ params }: Readonly<{ params: ProfileParams }>) {
  const profile = await getProfileOrNull(params);
  if (!profile) {
    return null;
  }
  const total = await tryApi(() => readCount(profile.user.id, 'episodes'));
  if (isUnavailable(total)) {
    return null;
  }
  return total > 0 ? (
    <EpisodesCount episodes={total} username={profile.user.username} />
  ) : null;
}

async function VisitorDescription({
  params,
}: Readonly<{ params: ProfileParams }>) {
  const { username } = await params;
  return (
    <p className={DESCRIPTION}>
      What {username} watched, by day, newest first. + saves a series that’s new
      to you.
    </p>
  );
}

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function History({ params, searchParams }: Props) {
  const [profile, search] = await Promise.all([
    getProfile(params, 'history'),
    searchParams,
  ]);
  const owner = profile.viewer === 'owner';
  // lenient: a malformed month opens the newest
  const month = parseMonthKey(firstValue(search.month));
  // The diary, the years and This week in the owner's zone (the zone read
  // apart from the years, so the diary doesn't wait on them)
  const { first, timeZone, week, years } = await loadHistoryStart(
    { ...withToken(profile), userId: profile.user.id },
    month,
    owner,
    Date.now(),
  );
  const stats = isUnavailable(years) ? null : years;
  const undated = stats?.undated ?? 0;
  if (first.items.length === 0 && !month) {
    return (
      <div data-slot="history-diary">
        <HistoryDayZero owner={owner} username={profile.user.username} />
        <DiaryEnd more={false} owner={owner} undated={undated} />
      </div>
    );
  }
  const jumpWeek = week === null || isUnavailable(week) ? null : week;
  const diaryYears = stats?.years ?? null;
  return (
    <div data-slot="history-diary">
      <Diary
        first={first}
        month={month}
        owner={owner}
        timeZone={timeZone}
        undated={undated}
        username={profile.user.username}
        week={jumpWeek}
        years={diaryYears}
      />
    </div>
  );
}
