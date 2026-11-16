'use client';

import { plural } from '@/lib/format/text';
import { useOwnEpisodeCount } from '@/lib/marking/hooks';

/**
 * "5,341 episodes": the server's count, moving with this tab's marks on
 * your own profile (`useOwnEpisodeCount`), the sidebar's and History's alike
 */
export default function EpisodesCount({
  episodes,
  username,
}: Readonly<{ episodes: number; username: string }>) {
  const shown = useOwnEpisodeCount(username, episodes);
  return <>{plural(shown, 'episode')}</>;
}
