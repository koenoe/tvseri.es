'use client';

import { episodeCode, shortCode } from '@tvseri.es/schemas';
import { memo } from 'react';

import { calendarGlyph, clockGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';
import { formatDuration } from '@/lib/format/duration';
import { codeOf } from '@/lib/marking/progress';
import type { WatchRecord } from '@/lib/marking/types';

import type { ShowEpisode } from '../../_lib/seasonEpisodes';
import { useClock } from './clock';
import EyePill from './EyePill';
import styles from './focusWall.module.css';
import { formatCountdown } from './format';
import type { EpisodeMark } from './marks';
import Still from './Still';
import {
  FOCUS,
  FOCUS_BODY,
  FOCUS_STILL,
  TILE_BODY,
  TILE_FRAME,
  TILE_STILL,
} from './tileLayout';
import {
  EpisodeMeta,
  FadedNumber,
  OpenEpisodeHit,
  STILL_SIZES,
  StillFade,
  TILE,
} from './tileParts';
import type { FocusLayout } from './wall';

type TileProps = Readonly<{
  episode: ShowEpisode;
  mark: EpisodeMark;
  record: WatchRecord | undefined;
  seriesId: number;
}>;

/**
 * The Focus tile: Next up. Still, "Next up · S03E05", the title, a
 * 3-line overview, date · runtime, "6 left in Season 3 · 3h 46m" and the
 * primary pill. On desktop 2 × 2 beside two tiles (`tall`), or across the row
 * when fewer than two follow it (`wide`). Settles in when Focus moves on.
 */
export const FocusTile = memo(function FocusTile({
  episode,
  layout,
  left,
  leftMinutes,
  mark,
  record,
  seriesId,
}: TileProps &
  Readonly<{ layout: FocusLayout; left: number; leftMinutes: number }>) {
  const look = FOCUS[layout];
  // No time when no runtime is known (never an invented one)
  const time = leftMinutes > 0 ? ` · ${formatDuration(leftMinutes)}` : '';
  const context = `${left} left in Season ${episode.seasonNumber}${time}`;
  const classes = cn(
    TILE,
    'flex flex-col',
    look.frame,
    episode.episodeNumber % 2 ? styles.a1 : styles.a0,
  );
  return (
    <div
      className={classes}
      data-episode-tile={codeOf(episode)}
      data-focus-layout={layout}
    >
      <div className={cn(FOCUS_STILL, look.still)}>
        <Still sizes={STILL_SIZES.focus} src={episode.stillImage} />
        <StillFade />
        <EyePill
          episode={episode}
          mark={mark}
          record={record}
          seriesId={seriesId}
          variant="primary"
        />
      </div>
      <div className={cn(FOCUS_BODY, look.body)}>
        <span className="inline-flex items-center gap-2 text-overline text-cyan uppercase before:size-1.5 before:rounded-full before:bg-cyan">
          {`Next up · ${episodeCode(episode)}`}
        </span>
        <h4 className={cn('text-title-2', look.title)}>{episode.title}</h4>
        <p
          className={cn(
            'line-clamp-2 max-w-160 text-body-sm text-white/80',
            look.overview,
          )}
        >
          {episode.description}
        </p>
        <EpisodeMeta episode={episode} />
        <span className="text-meta text-white/80">{context}</span>
      </div>
      <FadedNumber number={episode.episodeNumber} />
      <OpenEpisodeHit episode={episode} />
    </div>
  );
});
FocusTile.displayName = 'FocusTile';

/**
 * A tile Show all revealed: the browser skips its rendering until it nears
 * the viewport (a 60-episode season reveals ~50 at once). 364px is the
 * desktop tile; a phone's is about as tall.
 */
const DEFERRED =
  '[content-visibility:auto] [contain-intrinsic-size:auto_364px]';

type GridTileProps = Readonly<{ deferred: boolean; phoneHidden: boolean }>;

/** A tile after Focus: off on a phone past the fold, deferred once revealed. */
const gridTile = ({ deferred, phoneHidden }: GridTileProps) =>
  cn(TILE, TILE_FRAME, phoneHidden && 'max-md:hidden', deferred && DEFERRED);

/** "E05 Children": the number quiet before the title, on one line. */
function TileTitle({ episode }: Readonly<{ episode: ShowEpisode }>) {
  return (
    <h4 className="truncate text-body font-semibold">
      <span className="mr-2 text-white/60">
        {shortCode(episode.episodeNumber)}
      </span>
      {episode.title}
    </h4>
  );
}

/** An unwatched tile: production size, number + title, 2 lines, the pill. */
export const EpisodeTile = memo(function EpisodeTile({
  deferred,
  episode,
  mark,
  phoneHidden,
  record,
  seriesId,
}: TileProps & GridTileProps) {
  const classes = gridTile({ deferred, phoneHidden });
  return (
    <div className={classes} data-episode-tile={codeOf(episode)}>
      <div className={TILE_STILL}>
        <Still sizes={STILL_SIZES.tile} src={episode.stillImage} />
        <StillFade />
        <EyePill
          episode={episode}
          mark={mark}
          record={record}
          seriesId={seriesId}
          variant="tile"
        />
      </div>
      <div className={TILE_BODY}>
        <TileTitle episode={episode} />
        <p className="line-clamp-2 text-body-sm text-white/80">
          {episode.description}
        </p>
        <EpisodeMeta episode={episode} />
      </div>
      <FadedNumber number={episode.episodeNumber} />
      <OpenEpisodeHit episode={episode} />
    </div>
  );
});
EpisodeTile.displayName = 'EpisodeTile';

/** An upcoming tile (airing seasons): quiet, the pink countdown, no pill. */
export const UpcomingTile = memo(function UpcomingTile({
  deferred,
  episode,
  phoneHidden,
}: GridTileProps & Readonly<{ episode: ShowEpisode }>) {
  const clock = useClock();
  const classes = gridTile({ deferred, phoneHidden });
  const runtime = episode.runtime > 0 ? formatDuration(episode.runtime) : '';
  return (
    <div className={classes} data-episode-tile={codeOf(episode)}>
      <div className={TILE_STILL}>
        <Still
          className="brightness-45 grayscale-60"
          sizes={STILL_SIZES.tile}
          src={episode.stillImage}
        />
      </div>
      <div className={TILE_BODY}>
        <span className="inline-flex items-center gap-1.5 font-semibold text-[13px] text-pink leading-[18px]">
          <Icon glyph={calendarGlyph} size={13} />
          {formatCountdown(episode.airDate, clock)}
        </span>
        <TileTitle episode={episode} />
        <MetaRow>
          <MetaItem icon={clockGlyph}>{runtime}</MetaItem>
        </MetaRow>
      </div>
    </div>
  );
});
UpcomingTile.displayName = 'UpcomingTile';
