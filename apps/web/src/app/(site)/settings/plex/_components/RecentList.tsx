import { episodeCode, type RecentScrobble } from '@tvseri.es/schemas';

import CodeBadge from '@/components/ui/button/CodeBadge';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import LocalMoment from '../../_components/LocalMoment';

/** The Recent list: Plex's marks, newest first (the latest, or one day's). */
export default function RecentList({
  label,
  recent,
}: Readonly<{
  /** What the list holds ("Latest Plex marks") */
  label: string;
  recent: ReadonlyArray<RecentScrobble>;
}>) {
  return (
    <ul aria-label={label} className="flex flex-col">
      {recent.map((scrobble) => (
        <li
          className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-[rgb(229_160_13/0.18)] border-t py-3 text-body-sm text-white/80 first:border-t-0"
          key={`${scrobble.seriesId}-${scrobble.seasonNumber}-${scrobble.episodeNumber}-${scrobble.watchedAt}`}
        >
          <Icon
            active
            className="size-3.5 text-white/60"
            glyph={eyeGlyph}
            size={16}
          />
          <span className="flex min-w-0 items-center gap-2.5">
            <b className="min-w-0 truncate font-medium">{scrobble.title}</b>
            <CodeBadge code={episodeCode(scrobble)} size="lane" />
          </span>
          <span className="whitespace-nowrap text-white/60">
            <LocalMoment at={scrobble.watchedAt} style="day-first" />
          </span>
        </li>
      ))}
    </ul>
  );
}
