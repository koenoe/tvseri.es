import type { Person, PersonWatched } from '@tvseri.es/schemas';

import { getViewer } from '@/auth/viewer';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import SignedInOnly from '@/components/ui/viewer/SignedInOnly';
import { apiFetch } from '@/lib/api/client';
import { isUnavailable, tryApi } from '@/lib/cache/unavailable';

import { loadShowsView } from '@/lib/person/loaders';
import { watchedLine } from '../../_lib/watched';
import Fact, { FACTS } from '../sidebar/Fact';
import SeedWatched from './SeedWatched';

/**
 * The line's frame:
 * a 2px rule, 28px (16 on phones) above one 24px line. The placeholder and
 * the line share it, so the line lands in the space already there.
 */
const FRAME = 'border-t-2 border-white/8 pt-4 lg:pt-7';

export function WatchedPlaceholder() {
  return (
    <SignedInOnly
      className={`${FRAME} box-content h-6`}
      placeholder="person-watched"
    />
  );
}

/**
 * The viewer's watched line (private): "Watched 74 episodes, 3 of 67
 * shows", and the marks for Career and Shows. A request-time hole in the
 * cached page; signed out it draws nothing.
 */
export default async function WatchedHole({
  gender,
  id,
}: Readonly<{ gender: Person['gender']; id: number }>) {
  const viewer = await getViewer();
  if (!viewer) {
    // Signed out, the placeholder draws nothing; a stale display cookie
    // keeps its reserved space, so nothing shifts either way
    return <WatchedPlaceholder />;
  }
  // "3 of 67 shows" takes the Shows count (announced work is not in it), so
  // the page says one number everywhere. Read beside the viewer's marks, not
  // after them: a cold cache entry costs an API round trip. Without it the
  // line falls back to the API's count.
  const [watched, shows] = await Promise.all([
    tryApi(() =>
      apiFetch<PersonWatched>('/me/person/:id/watched', {
        accessToken: viewer.accessToken,
        notFound: 'null',
        params: { id },
      }),
    ),
    loadShowsView(id, gender).catch(() => null),
  ]);
  if (!watched || isUnavailable(watched)) {
    return <WatchedPlaceholder />;
  }
  if (watched.episodes === 0) {
    // Nothing watched yet: no line, the space kept
    return (
      <span
        aria-hidden="true"
        className="block h-[42px] lg:h-[54px]"
        data-slot="person-watched"
      />
    );
  }
  const total =
    shows && !isUnavailable(shows) ? shows.total : watched.totalShows;
  const line = watchedLine({ ...watched, totalShows: total });
  return (
    <>
      <div
        aria-label="Watched, signed in"
        className={`${FACTS} ${FRAME}`}
        data-slot="person-watched"
        role="group"
      >
        <Fact icon={eyeGlyph}>
          Watched <b className="font-semibold text-white">{line.episodes}</b>,{' '}
          {line.shows}
        </Fact>
      </div>
      <SeedWatched items={watched.items} personId={id} />
    </>
  );
}
