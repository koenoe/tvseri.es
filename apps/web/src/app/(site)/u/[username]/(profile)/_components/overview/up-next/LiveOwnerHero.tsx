'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';

import CrossFade from '@/components/motion/CrossFade';
import SwapIn from '@/components/motion/SwapIn';
import type { UpNextArt } from '@/components/up-next/UpNextItemCard';
import useFinishHold from '@/components/up-next/useFinishHold';
import { useLiveUpNext } from '@/lib/marking/hooks';
import useUpNextTitle from '@/lib/marking/useUpNextTitle';

import OwnerHero from './OwnerHero';

type Props = Readonly<{
  /** art per item, in the items' order (the first two are loaded) */
  art: ReadonlyArray<UpNextArt | null>;
  /** drawn when every show has left (all caught up after marks) */
  empty: ReactNode;
  items: ReadonlyArray<UpNextItem>;
  now: number;
}>;

/**
 * The owner's Up next read through the marking core (`useLiveUpNext`): the
 * Remote's "Watched next episode" (or a mark anywhere in the tab) moves the
 * hero on at once; a show with nothing aired left gives its place to the
 * next one, as the next load would. A new show cross-fades in (keyed on the
 * show, so the next episode of the same one is a plain update); the empty
 * state, a different height, rises in once the last show has left. When
 * your own mark finished the show, it completes first: its line fills and
 * its art dims, and a beat later the next one comes (`useFinishHold`).
 */
export default function LiveOwnerHero({ art, empty, items, now }: Props) {
  const live = useLiveUpNext(items, now);
  const head = useUpNextTitle(live[0]);
  const { finishing, shown: item } = useFinishHold(head);
  if (!item) {
    return <SwapIn swapKey="empty">{empty}</SwapIn>;
  }
  const index = items.findIndex(
    (candidate) => candidate.seriesId === item.seriesId,
  );
  const series = art[index] ?? null;
  return (
    <SwapIn swapKey="hero">
      <CrossFade swapKey={item.seriesId}>
        <OwnerHero
          finishing={finishing}
          item={item}
          now={now}
          series={series}
        />
      </CrossFade>
    </SwapIn>
  );
}
