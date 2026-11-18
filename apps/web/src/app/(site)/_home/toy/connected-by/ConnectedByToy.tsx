import type { ConnectedPath } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';

import { readAsViewer } from '../../data/personal';
import ConnectedBy from './ConnectedBy';
import ConnectedByGhost from './ConnectedByGhost';
import { getViewerPaths } from './data';

type Props = Readonly<{
  day: string;
  /** The day's shared paths (signed out's, in the static shell) */
  paths: ReadonlyArray<ConnectedPath>;
}>;

const signedOut = { [SIGNED_OUT_ONLY]: '' };
const signedIn = { [SIGNED_IN_ONLY]: '' };

/**
 * Signed in: paths from one of the viewer's own shows to shows in none of
 * their lists (`getViewerPaths`); signed out, or when none is left or a
 * read fails, the day's shared paths. Never the slot's failed state: the
 * shared paths are always there to show.
 */
async function ViewerConnectedBy({ day, paths }: Props) {
  const mine = await readAsViewer((accessToken) =>
    getViewerPaths(accessToken, day, paths),
  ).catch(() => null);
  const shown = mine ?? paths;
  return <ConnectedBy paths={shown} />;
}

/**
 * Connected by in the toy slot. The shared paths are in the static shell
 * for a signed-out visitor; a signed-in viewer (the display cookie says so
 * before the first paint) holds the card's placeholder instead while their
 * own paths stream in, so the shared ones never flash first.
 */
export default function ConnectedByToy({ day, paths }: Props) {
  const fallback = (
    <>
      <div {...signedOut} className="contents">
        <ConnectedBy paths={paths} />
      </div>
      <div {...signedIn} className="hidden">
        <ConnectedByGhost />
      </div>
    </>
  );
  return (
    <Suspense fallback={fallback}>
      <ViewerConnectedBy day={day} paths={paths} />
    </Suspense>
  );
}
