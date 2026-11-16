import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense, ViewTransition } from 'react';

import Page from '@/components/background/Page';
import OwnerVisitorSync from '@/components/ui/viewer/OwnerVisitorSync';
import statsPath from '@/lib/routing/statsPath';

import StatsBody, { StatsBodySkeleton } from './_components/StatsBody';
import { getStatsUser, isUnavailable } from './_data/loaders';
import { LAST_STATS_YEAR, parseStatsYear } from './_lib/year';

/**
 * `/u/{username}/stats/{year}` (STD_Recommended, STMobile): the one public
 * profile page. Everything on it is about the profile owner, so the page is
 * one cached entry per URL (ISR, regenerated 5 minutes after its last render:
 * the shortest life of its reads, `statsCurrent`; tags `user:{id}` and
 * `stats:{id}`): no `auth()`, cookies or headers. Only the `+` buttons of
 * Popular unwatched read the viewer, on the client.
 */

/**
 * One seed URL (Cache Components needs one): every other user and year
 * renders on its first visit and stays in the ISR cache. An invented user,
 * so the build is the same with or without the API (a 404 or placeholders).
 */
export function generateStaticParams() {
  return [{ username: 'example', year: String(LAST_STATS_YEAR - 2) }];
}

export async function generateMetadata({
  params,
}: PageProps<'/u/[username]/stats/[year]'>): Promise<Metadata> {
  const { username, year } = await params;
  if (!parseStatsYear(year)) {
    return {};
  }
  const user = await getStatsUser(username);
  if (!user || isUnavailable(user)) {
    return {};
  }
  return { title: `A year of tvseri.es with ${user.username}` };
}

/**
 * The shell is the page ground and the skeleton; the user's year renders in
 * the Suspense child from cached loaders (prerendered for the seed, generated
 * on a URL's first visit, then served from the ISR cache).
 */
export default function StatsPage({
  params,
}: PageProps<'/u/[username]/stats/[year]'>) {
  return (
    <Page>
      {/* renders nothing: no space to hold, it waits for the URL's params */}
      <Suspense fallback={null}>
        <OwnerVisitorSync />
      </Suspense>
      <div className="contents" data-testid="route-stats">
        {/* No animation of its own: with a prerendered shell, React starts no
            view transition for the year block's pair (`stats-glance`) unless
            the page has a boundary too (Next: "put the wrapper in page.tsx") */}
        <ViewTransition default="none">
          <Suspense fallback={<StatsBodySkeleton />}>
            <StatsRoute params={params} />
          </Suspense>
        </ViewTransition>
      </div>
    </Page>
  );
}

async function StatsRoute({
  params,
}: Readonly<{ params: PageProps<'/u/[username]/stats/[year]'>['params'] }>) {
  const { username, year: param } = await params;
  const year = parseStatsYear(param);
  if (!year) {
    notFound();
  }
  const user = await getStatsUser(username);
  if (user === null) {
    notFound();
  }
  // One URL per user: another spelling the API resolves goes to the
  // canonical one (malformed usernames never get here: the static 404)
  if (!isUnavailable(user) && user.username !== username) {
    permanentRedirect(statsPath(user.username, year));
  }
  return <StatsBody user={isUnavailable(user) ? null : user} year={year} />;
}
