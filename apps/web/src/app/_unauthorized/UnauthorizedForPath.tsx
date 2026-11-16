'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import UnauthorizedView from '@/components/ui/error/UnauthorizedView';
import { useRecheckViewer } from '@/lib/marking/hooks';

import profileFromPath from './profileFromPath';

/**
 * `unauthorized.tsx` gets no params, so the variant comes from the URL: on
 * someone's profile the way out is their public stats.
 * A browser that still shows a viewer here checks again (`useRecheckViewer`).
 */
export default function UnauthorizedForPath({
  header,
}: Readonly<{ header?: ReactNode }>) {
  useRecheckViewer();
  const username = profileFromPath(usePathname());
  if (!username) {
    return <UnauthorizedView header={header} variant="default" />;
  }
  return <ProfileUnauthorized header={header} username={username} />;
}

type StatsYear = number | null | 'unknown';

/** Handles the server was asked about again: once per page load, never a loop */
const askedAgain = new Set<string>();

/**
 * Asks once whether the profile's owner has public stats to show
 * (`/api/stats/:username`, CDN-cached): the link to them shows only then.
 * No such user, or a check that failed, claims nothing about them. The
 * page is only a 401 for an unknown handle when the server's
 * profile read failed, so a 404 from the check asks the server once more:
 * it then renders the 404 itself.
 */
function ProfileUnauthorized({
  header,
  username,
}: Readonly<{ header?: ReactNode; username: string }>) {
  const router = useRouter();
  const [checked, setChecked] = useState<
    Readonly<{ username: string; year: StatsYear }> | undefined
  >();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/stats/${encodeURIComponent(username)}`, {
      signal: controller.signal,
    })
      .then(async (response): Promise<StatsYear> => {
        if (response.status === 404) {
          if (!askedAgain.has(username)) {
            askedAgain.add(username);
            router.refresh();
          }
          return 'unknown';
        }
        return response.ok
          ? ((await response.json()) as { year: number | null }).year
          : 'unknown';
      })
      .then((year) => setChecked({ username, year }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setChecked({ username, year: 'unknown' });
        }
      });
    return () => controller.abort();
  }, [router, username]);
  const statsYear = checked?.username === username ? checked.year : undefined;
  return (
    <UnauthorizedView
      header={header}
      statsYear={statsYear}
      username={username}
      variant="profile"
    />
  );
}
