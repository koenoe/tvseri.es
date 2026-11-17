'use client';

import { type ReactNode, useCallback, useState } from 'react';
import Button from '@/components/ui/button/Button';
import { shuffleGlyph } from '@/components/ui/icon/glyphs';
import {
  ANOTHER_PATH_LABEL,
  PATH_HEAD,
  PATH_SWITCH,
  PATH_TITLE,
  PATH_TITLE_BOX,
} from './layout';

const TITLE = `${PATH_TITLE} ${PATH_TITLE_BOX}`;

/**
 * The card's header (the label, the path's title, "Another path") and the
 * chain it names. "Another path" steps to the next path, wrapping around;
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
  const next = useCallback(
    () => setCurrent((index) => (index + 1) % titles.length),
    [titles.length],
  );
  return (
    <>
      <div className={PATH_HEAD}>
        {label}
        <h3 aria-live="polite" className={TITLE} title={titles[current]}>
          {titles[current]}
        </h3>
        {titles.length > 1 ? (
          <Button className={PATH_SWITCH} icon={shuffleGlyph} onClick={next}>
            {ANOTHER_PATH_LABEL}
          </Button>
        ) : null}
      </div>
      {chains[current]}
    </>
  );
}
