'use client';

import RollingCount from '@/components/motion/RollingCount';
import { useOwnEpisodeCount } from '@/lib/marking/hooks';

/**
 * "5,341 episodes": the server's count, moving with this tab's marks on
 * your own profile (`useOwnEpisodeCount`), the sidebar's and History's
 * alike; the number rolls to its new value
 */
export default function EpisodesCount({
  episodes,
  username,
}: Readonly<{ episodes: number; username: string }>) {
  const shown = useOwnEpisodeCount(username, episodes);
  const noun = shown === 1 ? 'episode' : 'episodes';
  return (
    <>
      <RollingCount value={shown} /> {noun}
    </>
  );
}
