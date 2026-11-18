import { formatGrouped, plural } from '@tvseri.es/utils';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import {
  calendarGlyph,
  eyeGlyph,
  usersGlyph,
} from '@/components/ui/icon/glyphs';
import Handle from '@/components/ui/identity/Handle';
import {
  IDENTITY_BLOCK,
  IdentityLine,
  IdentityLines,
  IdentityLinkLine,
} from '@/components/ui/identity/IdentityLines';
import IdentityLinesGhost from '@/components/ui/identity/IdentityLinesGhost';
import WatchesOn from '@/components/ui/identity/WatchesOn';
import SectionHead from '@/components/ui/section/SectionHead';
import type { ProfileCounts } from '@/lib/profile/counts';
import profilePath from '@/lib/routing/profilePath';
import { isUnavailable, type StatsUser } from '@/lib/stats/loaders';
import StatsUnavailable from '../StatsUnavailable';
import { loadStatsHead, type StatsHeadParams } from './head';
import YearsList from './YearsList';

/** The sidebar's column: the box the parity checks measure */
const COLUMN = 'flex flex-col gap-10';

const PROFILE_BLOCK = `@container ${IDENTITY_BLOCK}`;

const PROFILE_GHOST = `animate-ghost ${IDENTITY_BLOCK}`;

/**
 * The desktop sidebar (sticky, in the Stats layout): the profile block with
 * the way back to the profile and the Years submenu. Nothing in it is about
 * one year (the year's Share is beside its title), so a year switch keeps it
 * as it is; only the highlighted year follows the URL (`YearLink`).
 */
export default async function StatsSidebar({
  params,
}: Readonly<{ params: StatsHeadParams }>) {
  const head = await loadStatsHead(params);
  if (!head) {
    return null;
  }
  const { counts, rows, user } = head;
  if (isUnavailable(counts) || isUnavailable(rows)) {
    const handle = `@${user.username}`;
    return (
      <StatsUnavailable placeholder={<StatsSidebarSkeleton />} title={handle} />
    );
  }
  return (
    <div className={COLUMN} data-slot="stats-aside">
      <Profile counts={counts} user={user} />
      <Divider />
      <section
        aria-labelledby="stats-side-years"
        className="flex flex-col gap-3"
      >
        <SectionHead id="stats-side-years" size="side" title="Years" />
        <YearsList fold rows={rows} username={user.username} />
      </section>
    </div>
  );
}

const Divider = () => (
  <span aria-hidden className="h-0.5 rounded-2 bg-white/8" />
);

function Profile({
  counts,
  user,
}: Readonly<{
  counts: ProfileCounts;
  user: StatsUser;
}>) {
  const profileHref = profilePath(user.username);
  const circleHref = profilePath(user.username, 'circle');
  const episodes = plural(counts.episodes, 'episode');
  const finished = `${formatGrouped(counts.finished)} finished`;
  const followers = plural(counts.followers, 'follower');
  const following = `${formatGrouped(counts.following)} following`;
  const services = user.watchProviders.filter((item) => item.logo);
  return (
    // the profile sidebar's identity, with the way back as its action; a
    // container, so the handle fits its size to the column (`Handle`)
    <section aria-label="Profile" className={PROFILE_BLOCK}>
      <Handle as="h2" href={profileHref} username={user.username} />
      <IdentityLines>
        {user.memberSince ? (
          <IdentityLine glyph={calendarGlyph}>
            Member since {user.memberSince}
          </IdentityLine>
        ) : null}
        <IdentityLine glyph={eyeGlyph}>
          {episodes}, {finished}
        </IdentityLine>
        <IdentityLinkLine glyph={usersGlyph} href={circleHref}>
          {followers} · {following}
        </IdentityLinkLine>
      </IdentityLines>
      <WatchesOn isOwner={false} providers={services} />
    </section>
  );
}

/** A typical member's years */
const YEAR_GHOSTS = [0, 1, 2];

/**
 * The sidebar's size while it loads (a page load only: a year switch keeps
 * the sidebar): the profile block and the Years submenu (three rows, 44px
 * each).
 */
export function StatsSidebarSkeleton() {
  return (
    <div className={COLUMN} data-placeholder="stats-aside">
      <div aria-hidden className={PROFILE_GHOST}>
        <Ghost className="h-[46px] w-40 rounded-8" />
        <IdentityLinesGhost />
        <Ghost className="h-[22px] rounded-4" />
      </div>
      <Divider />
      <div aria-hidden className="flex flex-col gap-3">
        <SectionHead id="stats-side-years-sk" size="side" title="Years" />
        <div className="flex h-[136px] animate-ghost flex-col gap-2">
          {YEAR_GHOSTS.map((n) => (
            <span className="flex h-10 items-center gap-3 px-2" key={n}>
              <TextLine className="w-24 text-body-sm" width="w-16" />
              <Ghost className="h-4 flex-1 rounded-2" />
              <TextLine className="text-caption" width="w-8" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
