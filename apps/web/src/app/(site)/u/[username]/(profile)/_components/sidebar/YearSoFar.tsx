import { formatGrouped } from '@tvseri.es/utils';
import { REST_IS_FINE } from '@/components/ui/error/unavailableCopy';
import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import SectionHead from '@/components/ui/section/SectionHead';
import { isUnavailable } from '@/lib/cache/unavailable';
import statsPath from '@/lib/routing/statsPath';
import { joinAnd } from '@/lib/text/fitNames';
import type { Profile } from '../../_data/profile';
import { loadYearSoFar, type YearSoFarStats } from '../../_data/stats';
import { formatWatchTime } from '../../_lib/format';
import BlockUnavailable from '../blocks/BlockUnavailable';
import HeadLink from '../blocks/HeadLink';
import { LinkGhost } from '../blocks/LaneGhost';
import WeekBars, { WEEK_BARS, WEEK_SLOT } from './year/WeekBars';
import { yearBars } from './year/yearBars';

/** A number or a name in the sentence: never broken across lines ("416d 23h") */
const Num = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <span className="font-semibold whitespace-nowrap text-white">{children}</span>
);

/** "137 episodes, 5d 1h of TV. Mostly Crime and Drama, mostly on Netflix." */
function Sentence({ stats }: Readonly<{ stats: YearSoFarStats }>) {
  const noun = stats.episodes === 1 ? 'episode' : 'episodes';
  const genres = joinAnd(stats.genres);
  return (
    <p className="m-0 text-body-sm text-white/60">
      <Num>{formatGrouped(stats.episodes)}</Num> {noun},{' '}
      <Num>{formatWatchTime(stats.runtime)}</Num> of TV.
      {genres ? (
        <>
          {' '}
          Mostly{' '}
          {stats.genres.map((genre, index) => (
            <span key={genre}>
              {index > 0 ? ' and ' : null}
              <Num>{genre}</Num>
            </span>
          ))}
          {stats.provider ? `, mostly on ${stats.provider}.` : '.'}
        </>
      ) : stats.provider ? (
        ` Mostly on ${stats.provider}.`
      ) : null}
    </p>
  );
}

/**
 * "2026 so far": one line of weeks and one sentence. The current UTC
 * year, public stats only (a visitor sees the owner's). On day 1: flat bars and
 * "Your year starts with your first episode."
 */
const GHOST_BLOCK = `flex flex-col gap-4 ${PULSE}`;

export default async function YearSoFar({
  profile,
}: Readonly<{ profile: Profile }>) {
  const { id, username } = profile.user;
  const now = Date.now();
  const year = new Date(now).getUTCFullYear();
  const stats = await loadYearSoFar(id, year);
  if (isUnavailable(stats)) {
    // an outage: the numbers aren't there, which isn't a year with no episodes
    return (
      <BlockUnavailable
        className="h-[160px] rounded-16"
        line={REST_IS_FINE}
        title={`${year} so far isn’t available.`}
      />
    );
  }
  const empty = stats.episodes === 0;
  // Day one has no Stats link: there is nothing to open yet
  const link = empty ? null : (
    <HeadLink href={statsPath(username, year)}>Stats</HeadLink>
  );
  const bars = yearBars(stats.weeks, year, now);
  const who = profile.viewer === 'owner' ? '' : `${username} `;
  const label = `Episodes ${who}watched per week in ${year}`;
  const title = `${year} so far`;
  return (
    <section aria-labelledby="i-yr" className="flex flex-col gap-4">
      <SectionHead id="i-yr" link={link} size="side" title={title} />
      <WeekBars bars={bars} flat={empty} label={label} />
      {empty ? (
        <p className="m-0 text-body-sm text-white/60">
          {profile.viewer === 'owner'
            ? 'Your year starts with your first episode.'
            : `${username}’s year starts with their first episode.`}
        </p>
      ) : (
        <Sentence stats={stats} />
      )}
    </section>
  );
}

/** A year's weeks, as even ghost bars */
const WEEKS = Array.from({ length: 52 }, (_, n) => n);

/**
 * The block while it streams: the title (the year is a bar: the clock
 * decides it), the Stats link as a bar, the weeks as even ghost bars and the
 * two-line sentence.
 */
export function YearSoFarSkeleton() {
  const link = <LinkGhost width="w-12" />;
  const title = <TextLine className="text-title-3" width="w-28" />;
  return (
    <div aria-hidden="true" className={GHOST_BLOCK}>
      <SectionHead id="i-yr-sk" link={link} size="side" title={title} />
      <div className={WEEK_BARS}>
        {WEEKS.map((week) => (
          <span className={WEEK_SLOT} key={week}>
            <Ghost className="h-1/3 w-full rounded-2" />
          </span>
        ))}
      </div>
      <span className="flex flex-col">
        <TextLine className="text-body-sm" width="w-full" />
        <TextLine className="text-body-sm" width="w-2/3" />
      </span>
    </div>
  );
}
