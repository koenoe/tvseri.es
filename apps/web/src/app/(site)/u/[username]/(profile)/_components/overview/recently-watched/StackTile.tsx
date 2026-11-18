'use client';

import { useCallback, useState } from 'react';
import PosterLink from '@/components/ui/tile/PosterLink';

import NewToYouTag from '../../blocks/NewToYouTag';
import Pile, { type PileCardData } from '../../blocks/Pile';
import Slot from './Slot';
import {
  NEW_TAG,
  NEW_TAG_TEXT,
  RECENT_POSTER,
  RECENT_POSTER_SIZES,
  type TileData,
  TileLabel,
} from './tiles';

const SPREAD =
  'group-data-[open=true]/pile:gap-x-4 group-data-[open=true]/pile:gap-y-6';

/**
 * Consecutive episodes of one show: the shared pile with the count chip and
 * the range under it; a click spreads it into one poster per episode, side
 * by side, and widens this column to fit.
 */
export default function StackTile({ tile }: Readonly<{ tile: TileData }>) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  // spread in one line: every episode side by side, the row scrolls
  const columns = tile.episodes.length;
  const cards: ReadonlyArray<PileCardData> = tile.episodes.map((episode) => {
    const label = `${tile.title}, ${episode.code}`;
    return {
      key: episode.code,
      node: (
        <span className="flex min-w-0 flex-col gap-2.5">
          <PosterLink
            href={tile.href}
            label={label}
            look={RECENT_POSTER}
            poster={tile.poster}
            sizes={RECENT_POSTER_SIZES}
            title={tile.title}
          />
          <TileLabel
            className="group-data-[open=false]/pile:hidden"
            code={episode.code}
            when={episode.when}
          />
        </span>
      ),
    };
  });
  const footer = (
    // One line, nowrap; the day ends with an ellipsis
    <span className="mt-2.5 flex min-w-0 items-center justify-between gap-1.5">
      <span className="inline-flex h-6 min-w-14 shrink-0 items-center justify-center rounded-6 bg-white/10 px-1.5 text-caption font-medium tabular-nums text-white">
        {tile.range}
      </span>
      <span
        className="min-w-0 truncate text-caption text-white/60"
        title={tile.rangeWhen}
      >
        {tile.rangeWhen}
      </span>
    </span>
  );
  return (
    <Slot columns={columns} open={open}>
      {tile.isNew ? (
        <NewToYouTag
          className={NEW_TAG}
          textClassName={NEW_TAG_TEXT}
          variant="art"
        />
      ) : null}
      <Pile
        cards={cards}
        columns={columns}
        footer={footer}
        label={tile.title}
        onToggle={toggle}
        open={open}
        peek="above"
        spreadClass={SPREAD}
      />
    </Slot>
  );
}
