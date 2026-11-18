import type { UpNextItem } from '@tvseri.es/schemas';
import CodeBadge from '@/components/ui/button/CodeBadge';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import { formatWhen } from '@/lib/format/when';
import showPath from '@/lib/routing/showPath';
import { LANE_ROW } from '../blocks/Lane';
import LanePoster from '../blocks/LanePoster';
import NewToYouTag from '../blocks/NewToYouTag';
import WatchlistAdd from '../blocks/WatchlistAdd';

/**
 * The tag's words beside the code from a 160px line (a 390px phone); on a
 * narrower one (360) the sparkle alone, its title says it, so the code stays
 * whole
 */
const TAG_TEXT = 'hidden @min-[160px]/also:inline';

/**
 * One of their other shows in progress: code and day, the
 * tag when it is new to you, a + (none for a show you have finished: there
 * is nothing to save it for)
 */
export default function AlsoRow({
  canAdd,
  isNew,
  item,
  now,
}: Readonly<{
  canAdd: boolean;
  isNew: boolean;
  item: UpNextItem;
  now: number;
}>) {
  const href = showPath(item.seriesId, item.slug);
  const code = item.lastWatchedCode ?? item.code;
  const when = item.lastWatchedAt ?? item.airDate;
  return (
    <li className={LANE_ROW}>
      <TileLink
        aria-label={item.title}
        className="shrink-0"
        href={href}
        tabIndex={-1}
      >
        <LanePoster src={item.posterImage} width={40} />
      </TileLink>
      <span className="@container/also flex min-w-0 flex-1 flex-col gap-2">
        <TileLink
          className="min-w-0 truncate text-body-sm font-semibold"
          href={href}
          title={item.title}
        >
          {item.title}
        </TileLink>
        <span className="flex min-w-0 items-center justify-between gap-2">
          <MetaRow className="h-[22px] min-w-0 flex-1 gap-2.5" fit="drop">
            <CodeBadge code={code} size="meta" />
            {when ? (
              <MetaItem icon={calendarGlyph}>{formatWhen(when, now)}</MetaItem>
            ) : null}
          </MetaRow>
          {isNew ? (
            <span className="flex shrink-0">
              <NewToYouTag textClassName={TAG_TEXT} variant="inline" />
            </span>
          ) : null}
        </span>
      </span>
      {canAdd ? (
        <WatchlistAdd seriesId={item.seriesId} title={item.title} />
      ) : null}
    </li>
  );
}
