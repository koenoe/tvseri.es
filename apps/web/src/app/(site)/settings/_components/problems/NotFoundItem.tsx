'use client';

import { shortCode } from '@tvseri.es/schemas';
import { AnimatePresence } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import FoldPresence from '@/components/motion/FoldPresence';
import SwapIn from '@/components/motion/SwapIn';
import Button from '@/components/ui/button/Button';
import { refreshGlyph, searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { EpisodeOption } from '@/lib/import/contract';
import type { SearchShow } from '@/lib/search/searchView';
import FixDone, { FixStatus } from './FixDone';
import type { Fix } from './fix';
import { keepFocusInItem } from './itemFocus';
import ManualSearch from './ManualSearch';
import OptionChip from './OptionChip';
import { ProblemItemFrame } from './ProblemGroup';
import type { ProblemItem } from './problems';
import { SMALL_BUTTON } from './styles';

export type NotFoundHandlers = Readonly<{
  onPickEpisode: (item: ProblemItem, episode: EpisodeOption) => void;
  onPickShow: (item: ProblemItem, show: SearchShow) => void;
  /** Sends a failed write again (the import: only its writes fail) */
  onRetry?: (item: ProblemItem) => void;
  onSkip: (item: ProblemItem) => void;
  /** Takes a kept fix back (the import) */
  onUndo?: (key: string) => void;
}>;

/**
 * Its episodes open above Search manually, which keeps its place and focus,
 * so they fold in; the fold takes the gap under it back
 */
const EPISODES_FOLD = '-mb-3';
const EPISODES_GAP = 'pb-3';

/**
 * A row TMDB didn't know: Search manually (the show,
 * or for a known show the episode) or Skip. A write that failed offers
 * Try again. The search, and what became of it, rise into the buttons'
 * place.
 */
export default function NotFoundItem({
  count,
  fix,
  handlers,
  item,
}: Readonly<{
  /** "18 rows", "3 entries" */
  count: string;
  /** What became of it, in a list that keeps settled items (the import) */
  fix?: Fix;
  handlers: NotFoundHandlers;
  item: ProblemItem;
}>) {
  const [searching, setSearching] = useState(false);
  const undo = () => keepFocusInItem(() => handlers.onUndo?.(item.key));
  const skip = () => keepFocusInItem(() => handlers.onSkip(item));
  const searchRef = useRef<HTMLInputElement>(null);
  // Search manually leaves with its press, so the box opening takes focus
  // (here, not on mount: an Undo from the toast reopens it too)
  const search = () => {
    flushSync(() => setSearching(true));
    searchRef.current?.focus();
  };
  const retry = () => keepFocusInItem(() => handlers.onRetry?.(item));
  const failed = item.kind === 'failed';
  const pickShow = (show: SearchShow) =>
    keepFocusInItem(() => handlers.onPickShow(item, show));
  const byEpisode =
    item.kind === 'episode-not-found' &&
    item.series !== null &&
    item.episodes.length > 0;
  const stage = fix ? 'done' : searching && !byEpisode ? 'search' : 'ask';
  const picking = searching && byEpisode;

  return (
    <ProblemItemFrame
      count={count}
      itemKey={item.key}
      title={item.title}
      why={item.why}
    >
      <FixStatus fix={fix} title={item.title} />
      <SwapIn className="flex flex-col gap-3" swapKey={stage}>
        {fix ? <FixDone fix={fix} onUndo={undo} /> : null}
        {stage === 'search' ? (
          <ManualSearch
            inputRef={searchRef}
            onPick={pickShow}
            onSkip={skip}
            query={item.query}
          />
        ) : null}
        {stage === 'ask' ? (
          <>
            <AnimatePresence initial={false}>
              {picking ? (
                <FoldPresence className={EPISODES_FOLD} key="episodes">
                  <div className={EPISODES_GAP}>
                    <EpisodePicker handlers={handlers} item={item} />
                  </div>
                </FoldPresence>
              ) : null}
            </AnimatePresence>
            <ItemActions
              failed={failed}
              onRetry={retry}
              onSearch={search}
              onSkip={skip}
            />
          </>
        ) : null}
      </SwapIn>
    </ProblemItemFrame>
  );
}

/** Search manually (Try again for a failed write) and Skip */
function ItemActions({
  failed,
  onRetry,
  onSearch,
  onSkip,
}: Readonly<{
  /** A write that failed: Try again in place of Search manually */
  failed: boolean;
  onRetry: () => void;
  onSearch: () => void;
  onSkip: () => void;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {failed ? (
        <Button
          className={SMALL_BUTTON}
          icon={refreshGlyph}
          iconSize={13}
          onClick={onRetry}
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
          onClick={onSearch}
          size="xs"
          variant="tonal"
        >
          <span className="text-body-sm">Search manually</span>
        </Button>
      )}
      <Button
        className={SMALL_BUTTON}
        onClick={onSkip}
        size="xs"
        variant="quiet"
      >
        <span className="text-body-sm">Skip</span>
      </Button>
    </div>
  );
}

/** "Wednesday (2022) · Season 2: which episode was it?" and its episodes. */
function EpisodePicker({
  handlers,
  item,
}: Readonly<{ handlers: NotFoundHandlers; item: ProblemItem }>) {
  const { onPickEpisode } = handlers;
  const pick = useCallback(
    (episode: EpisodeOption) =>
      keepFocusInItem(() => onPickEpisode(item, episode)),
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
        {item.episodes.map((episode) => {
          const episodeId = `${episode.seasonNumber}-${episode.episodeNumber}`;
          return (
            <OptionChip key={episodeId} onPick={pick} value={episode}>
              {`${shortCode(episode.episodeNumber)} · ${episode.title}`}
            </OptionChip>
          );
        })}
      </div>
    </div>
  );
}
