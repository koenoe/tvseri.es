'use client';

import { type ReactNode, useCallback, useId, useRef, useState } from 'react';
import { usePillGlide } from '@/components/motion/usePillGlide';
import { onAirGlyph } from '@/components/ui/icon/glyphs';

import { MomentFrame } from '../../feature/Moment';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import useWarmSet from '../useWarmSet';
import ChannelArrows from './ChannelArrows';
import ChannelList, { type ChannelRow } from './ChannelList';
import { REMOTE, REMOTE_HEAD, REMOTE_LABEL, WHATS_ON_GRID } from './layout';
import Screen from './Screen';
import { zap } from './zap';

/**
 * The interactive half of What's on: which channel is on. Up/down (in the
 * remote's label row) and the list (click, or arrows / Home / End inside
 * it) change channel, wrapping around; each change zaps the screen and
 * glides the list's highlight to the new channel (`usePillGlide`). The
 * channels next to the current one are kept warm so up/down never shows an
 * empty screen. The block has no title row above it: the label row heads
 * the remote and names the section.
 */
export default function WhatsOnRemote({
  backdrops,
  captions,
  rows,
  title,
}: Readonly<{
  backdrops: ReadonlyArray<ReactNode>;
  captions: ReadonlyArray<ReactNode>;
  rows: ReadonlyArray<ChannelRow>;
  title: string;
}>) {
  const count = rows.length;
  const headingId = useId();
  const [current, setCurrent] = useState(0);
  // the channel on, for `tune` (set only there), so `tune` stays stable and a
  // change re-renders only the two channel buttons whose state changed
  const currentRef = useRef(0);
  const [warm, addWarm] = useWarmSet([0, 1, count - 1]);
  const zapRef = useRef<HTMLSpanElement>(null);
  // every change of channel is the viewer's: up/down, a click or a key
  const listRef = useRef<HTMLDivElement>(null);
  const pick = usePillGlide(listRef, String(current));

  const tune = useCallback(
    (index: number) => {
      const next = (index + count) % count;
      if (next === currentRef.current) {
        return;
      }
      currentRef.current = next;
      pick();
      setCurrent(next);
      addWarm(next, (next + 1) % count, (next - 1 + count) % count);
      zap(zapRef.current);
    },
    [addWarm, count, pick],
  );

  return (
    <MomentFrame name="toy">
      <section aria-labelledby={headingId} className={PAGE_COLUMN}>
        <div className={WHATS_ON_GRID}>
          <Screen
            backdrops={backdrops}
            caption={captions[current]}
            current={current}
            warm={warm}
            zapRef={zapRef}
          />
          <div className={REMOTE}>
            <div className={REMOTE_HEAD}>
              <MomentLabel
                className={REMOTE_LABEL}
                glyph={onAirGlyph}
                id={headingId}
                title={title}
              />
              <ChannelArrows current={current} onTune={tune} />
            </div>
            <ChannelList
              current={current}
              onTune={tune}
              onWarm={addWarm}
              ref={listRef}
              rows={rows}
            />
          </div>
        </div>
      </section>
    </MomentFrame>
  );
}
