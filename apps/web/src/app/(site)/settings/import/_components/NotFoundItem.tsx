'use client';

import { shortCode } from '@tvseri.es/schemas';
import { useCallback, useState } from 'react';

import Button from '@/components/ui/button/Button';
import { refreshGlyph, searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { EpisodeOption } from '@/lib/import/contract';
import type { SearchShow } from '@/lib/search/searchView';
import type { Fix } from '../_lib/importState';
import { type ProblemItem, rowCount } from '../_lib/problems';
import FixDone from './FixDone';
import ManualSearch from './ManualSearch';
import OptionChip from './OptionChip';
import { ProblemItemFrame } from './ProblemGroup';
import { SMALL_BUTTON } from './styles';

export type NotFoundHandlers = Readonly<{
  onPickEpisode: (item: ProblemItem, episode: EpisodeOption) => void;
  onPickShow: (item: ProblemItem, show: SearchShow) => void;
  onRetry: (item: ProblemItem) => void;
  onSkip: (item: ProblemItem) => void;
  onUndo: (key: string) => void;
}>;

/**
 * A row TMDB didn't know: Search manually (the show,
 * or for a known show the episode) or Skip. A write that failed offers
 * Try again.
 */
export default function NotFoundItem({
  fix,
  handlers,
  item,
}: Readonly<{
  fix: Fix | undefined;
  handlers: NotFoundHandlers;
  item: ProblemItem;
}>) {
  const [searching, setSearching] = useState(false);
  const undo = () => handlers.onUndo(item.key);
  const skip = () => handlers.onSkip(item);
  const search = () => setSearching(true);
  const retry = () => handlers.onRetry(item);
  const pickShow = (show: SearchShow) => handlers.onPickShow(item, show);
  const byEpisode =
    item.kind === 'episode-not-found' &&
    item.series &&
    item.episodes.length > 0;

  if (fix) {
    return (
      <ProblemItemFrame
        count={rowCount(item.indexes.length)}
        title={item.title}
        why={item.why}
      >
        <FixDone fix={fix} onUndo={undo} />
      </ProblemItemFrame>
    );
  }
  return (
    <ProblemItemFrame
      count={rowCount(item.indexes.length)}
      title={item.title}
      why={item.why}
    >
      {searching && byEpisode ? (
        <EpisodePicker handlers={handlers} item={item} />
      ) : null}
      {searching && !byEpisode ? (
        <ManualSearch onPick={pickShow} onSkip={skip} query={item.query} />
      ) : null}
      {searching && !byEpisode ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {item.kind === 'failed' ? (
            <Button
              className={SMALL_BUTTON}
              icon={refreshGlyph}
              iconSize={13}
              onClick={retry}
              size="xs"
              variant="tonal"
            >
              <span className="text-body-sm">Try again</span>
            </Button>
          ) : (
            <Button
              className={SMALL_BUTTON}
              icon={searchGlyph}
              iconSize={13}
              onClick={search}
              size="xs"
              variant="tonal"
            >
              <span className="text-body-sm">Search manually</span>
            </Button>
          )}
          <Button
            className={SMALL_BUTTON}
            onClick={skip}
            size="xs"
            variant="quiet"
          >
            <span className="text-body-sm">Skip</span>
          </Button>
        </div>
      )}
    </ProblemItemFrame>
  );
}

/** "Wednesday (2022) · Season 2: which episode was it?" and its episodes. */
function EpisodePicker({
  handlers,
  item,
}: Readonly<{ handlers: NotFoundHandlers; item: ProblemItem }>) {
  const { onPickEpisode } = handlers;
  const pick = useCallback(
    (episode: EpisodeOption) => onPickEpisode(item, episode),
    [onPickEpisode, item],
  );
  const series = item.series;
  const name = series
    ? series.year
      ? `${series.title} (${series.year})`
      : series.title
    : item.query;
  const where = item.season ? ` · ${item.season}` : '';
  return (
    <div className="flex flex-col gap-3 rounded-12 bg-black/22 px-4 py-3 text-meta leading-5 text-white/80">
      <span className="flex items-center gap-2">
        <Icon className="shrink-0" glyph={searchGlyph} size={13} />
        {`${name}${where}: which episode was it?`}
      </span>
      <div className="flex flex-wrap gap-2">
        {item.episodes.map((episode) => (
          <OptionChip
            key={`${episode.seasonNumber}-${episode.episodeNumber}`}
            onPick={pick}
            value={episode}
          >
            {`${shortCode(episode.episodeNumber)} · ${episode.title}`}
          </OptionChip>
        ))}
      </div>
    </div>
  );
}
