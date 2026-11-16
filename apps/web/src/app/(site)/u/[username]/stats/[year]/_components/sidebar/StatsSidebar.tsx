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
import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';
import type { ProfileCounts } from '@/lib/profile/counts';
import profilePath from '@/lib/routing/profilePath';
import {
  getProfileCounts,
  isUnavailable,
  type StatsUser,
} from '../../_data/loaders';
import ShareEntry from '../share/ShareEntry';
import type { SectionProps } from '../types';
import StatsUnavailable from '../ui/StatsUnavailable';
import YearsList from './YearsList';
import { loadYearRows } from './years';

/**
 * The desktop sidebar (sticky): the profile
 * block with the way back to the profile, the Years submenu and, for a
 * finished year, the Share entry.
 */
export default async function StatsSidebar({
  shareable,
  user,
  year,
}: SectionProps) {
  const [counts, rows] = await Promise.all([
    getProfileCounts(user.id),
    loadYearRows(user.id),
  ]);
  if (isUnavailable(counts) || isUnavailable(rows)) {
    return (
      <StatsUnavailable
        id="stats-sidebar"
        placeholder={<StatsSidebarSkeleton />}
        title={`@${user.username}`}
      />
    );
  }
  return (
    <>
      <Profile counts={counts} user={user} />
      <Divider />
      <section
        aria-labelledby="stats-side-years"
        className="flex flex-col gap-3"
      >
        <SectionHead id="stats-side-years" size="side" title="Years" />
        <YearsList rows={rows} selected={year} username={user.username} />
      </section>
      {shareable ? (
        <>
          <Divider />
          <section
            aria-labelledby="stats-side-share"
            className="flex flex-col gap-3"
          >
            <SectionHead id="stats-side-share" size="side" title="Share" />
            <ShareEntry user={user} year={year} />
          </section>
        </>
      ) : null}
    </>
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
    <section aria-label="Profile" className={`@container ${IDENTITY_BLOCK}`}>
      <Handle as="h2" href={profileHref} username={user.username} />
      <IdentityLines>
        <IdentityLine glyph={calendarGlyph}>
          Member since {user.memberSince}
        </IdentityLine>
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

/**
 * The sidebar's size while it loads: the profile block, the Years submenu
 * (three rows, 44px each) and a finished year's Share.
 */
/** A typical member's years */
const YEAR_GHOSTS = [0, 1, 2];

export function StatsSidebarSkeleton() {
  return (
    <>
      <div aria-hidden className={`animate-ghost ${IDENTITY_BLOCK}`}>
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
      {/* A finished year's Share only (`data-stats-year` on <html>) */}
      <div
        aria-hidden
        className="hidden flex-col gap-10 [html[data-stats-year=finished]_&]:flex"
      >
        <Divider />
        <div className="flex flex-col gap-3">
          <SectionHead id="stats-side-share-sk" size="side" title="Share" />
          <Ghost className="h-[38px] animate-ghost rounded-12" />
        </div>
      </div>
    </>
  );
}
