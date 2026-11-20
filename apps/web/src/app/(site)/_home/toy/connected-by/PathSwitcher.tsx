'use client';

import { type ReactNode, useState } from 'react';
import CrossFade from '@/components/motion/CrossFade';
import Button from '@/components/ui/button/Button';
import { shuffleGlyph } from '@/components/ui/icon/glyphs';
import {
  ANOTHER_PATH_LABEL,
  PATH_CHAIN,
  PATH_CHAIN_SLOT,
  PATH_HEAD,
  PATH_SWITCH,
  PATH_TITLE,
  PATH_TITLE_BOX,
  PATH_TITLE_LINES,
} from './layout';

const TITLE = `${PATH_TITLE} ${PATH_TITLE_LINES}`;

/**
 * The card's header (the label, the path's title, "Another path") and the
 * chain it names. "Another path" steps to the next path, wrapping around,
 * the title and the chain swapping like Home's other decks
 * (`CrossFade`);
 * it's left out when the day has one path.
 */
export default function PathSwitcher({
  chains,
  label,
  titles,
}: Readonly<{
  chains: ReadonlyArray<ReactNode>;
  /** the block's heading, first in the head */
  label: ReactNode;
  titles: ReadonlyArray<string>;
}>) {
  const [current, setCurrent] = useState(0);
  // Empty until Another path: the first title is read with the page, not twice
  const [announced, setAnnounced] = useState('');
  const next = () => {
    const index = (current + 1) % titles.length;
    setCurrent(index);
    setAnnounced(titles[index] ?? '');
  };
  return (
    <>
      <div className={PATH_HEAD}>
        {label}
        {/* always there: the title swaps out of it, and a region that
            appears with its text is not reliably announced */}
        <p aria-live="polite" className="sr-only">
          {announced}
        </p>
        <CrossFade frame={PATH_TITLE_BOX} swapKey={current}>
          <h3 className={TITLE} title={titles[current]}>
            {titles[current]}
          </h3>
        </CrossFade>
        {titles.length > 1 ? (
          <Button className={PATH_SWITCH} icon={shuffleGlyph} onClick={next}>
            {ANOTHER_PATH_LABEL}
          </Button>
        ) : null}
      </div>
      <CrossFade
        className={PATH_CHAIN}
        frame={PATH_CHAIN_SLOT}
        swapKey={current}
      >
        {chains[current]}
      </CrossFade>
    </>
  );
}
