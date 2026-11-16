'use client';

import { type ReactNode, useCallback, useState } from 'react';
import WatchlistToggle from '@/components/marking/WatchlistToggle';
import Button from '@/components/ui/button/Button';
import { shuffleGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import type { ShowRef } from '@/lib/marking/showActions';
import { ACTION_PAIR, ACTION_PAIR_BUTTON } from '../../actionPair';
import {
  ANOTHER_PATH_LABEL,
  HEAD_WATCHLIST,
  PATH_FOOT,
  PATH_HEAD,
  PATH_SWITCH,
  PATH_TITLE,
  PATH_TITLE_BOX,
} from './layout';

const TITLE = `${PATH_TITLE} ${PATH_TITLE_BOX}`;
const ACTIONS = cn(ACTION_PAIR, PATH_SWITCH);
const HEAD_END = cn(ACTION_PAIR_BUTTON, HEAD_WATCHLIST);

/**
 * The card's header (the label, the path's title, the
 * actions) and the chain it names. The end's Watchlist sits beside
 * "Another path" from md and under the path on a phone. "Another path"
 * steps to the next path, wrapping around; it's left out when the day has
 * one path.
 */
export default function PathSwitcher({
  chains,
  ends,
  label,
  titles,
}: Readonly<{
  chains: ReadonlyArray<ReactNode>;
  /** Each path's end, the show its Watchlist adds */
  ends: ReadonlyArray<ShowRef>;
  /** the block's heading, first in the head */
  label: ReactNode;
  titles: ReadonlyArray<string>;
}>) {
  const [current, setCurrent] = useState(0);
  const next = useCallback(
    () => setCurrent((index) => (index + 1) % titles.length),
    [titles.length],
  );
  const end = ends[current];
  return (
    <>
      <div className={PATH_HEAD}>
        {label}
        <h3 aria-live="polite" className={TITLE} title={titles[current]}>
          {titles[current]}
        </h3>
        <span className={ACTIONS}>
          {end ? (
            <WatchlistToggle
              className={HEAD_END}
              id={end.id}
              key={end.id}
              size="md"
              title={end.title}
            />
          ) : null}
          {titles.length > 1 ? (
            <Button
              className={ACTION_PAIR_BUTTON}
              icon={shuffleGlyph}
              onClick={next}
            >
              {ANOTHER_PATH_LABEL}
            </Button>
          ) : null}
        </span>
      </div>
      {chains[current]}
      {end ? (
        <div className={PATH_FOOT}>
          <WatchlistToggle
            className={ACTION_PAIR_BUTTON}
            id={end.id}
            key={end.id}
            size="md"
            title={end.title}
          />
        </div>
      ) : null}
    </>
  );
}
