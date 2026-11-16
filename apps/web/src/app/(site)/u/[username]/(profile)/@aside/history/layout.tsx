import { type ReactNode, Suspense } from 'react';

import { isUnavailable } from '@/lib/cache/unavailable';
import profilePath from '@/lib/routing/profilePath';

import BlockError from '../../_components/blocks/BlockError';
import { SidebarRule } from '../../_components/shell/SidebarBlocksSkeleton';
import SubpageMarker from '../../_components/shell/SubpageMarker';
import { getProfile, type ProfileParams, withToken } from '../../_data/profile';
import JumpHeading from '../../history/_components/JumpHeading';
import JumpTo from '../../history/_components/JumpTo';
import JumpToSkeleton from '../../history/_components/JumpToSkeleton';
import { loadHistoryYears, loadJumpWeek } from '../../history/_data/history';
import { monthIndex } from '../../history/_lib/diary';

type Props = Readonly<{ params: ProfileParams }>;

/** Under the identity (~330px), the rule and the heading, below the pill (96px) */
const JUMP_SCROLL =
  'max-h-[calc(100dvh-30rem)] min-h-60 overflow-y-auto overscroll-contain [scrollbar-width:thin]';

/**
 * History's sidebar under the identity: a rule, then Jump to.
 * A slot layout, so a `?month=` change never remounts it. With the sidebar
 * only (`lg`): below it the month header's Jump opens the same list.
 */
export default function HistoryAside({
  children,
  params,
}: Readonly<{ children: ReactNode; params: ProfileParams }>) {
  return (
    <>
      <SubpageMarker />
      <div className="-mt-4 flex flex-col max-lg:hidden">
        <SidebarRule />
        <div className="mt-5 flex min-h-0 flex-col">
          <JumpHeading />
          <BlockError fallback={<JumpToSkeleton />} title="Jump to">
            <Suspense fallback={<JumpToSkeleton />}>
              {/* the sidebar sticks: a long open year scrolls in its own box,
                  so its last months stay in reach on a short screen */}
              <div className={JUMP_SCROLL}>
                <Jump params={params} />
              </div>
            </Suspense>
          </BlockError>
        </div>
      </div>
      {children}
    </>
  );
}

async function Jump({ params }: Props) {
  const profile = await getProfile(params);
  const owner = profile.viewer === 'owner';
  const [years, week] = await Promise.all([
    loadHistoryYears(profile.user.id),
    owner
      ? loadJumpWeek(
          { ...withToken(profile), userId: profile.user.id },
          Date.now(),
        )
      : null,
  ]);
  if (isUnavailable(years)) {
    throw new Error('Jump to: the years are unavailable');
  }
  const basePath = profilePath(profile.user.username, 'history');
  return (
    <div data-slot="history-jump">
      <JumpTo
        basePath={basePath}
        index={monthIndex(years.years)}
        week={week === null || isUnavailable(week) ? null : week}
      />
    </div>
  );
}
