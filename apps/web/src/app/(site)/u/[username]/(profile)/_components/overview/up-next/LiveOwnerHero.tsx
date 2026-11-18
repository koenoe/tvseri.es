'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';

import type { UpNextArt } from '@/components/up-next/UpNextItemCard';
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
 * next one, as the next load would.
 */
export default function LiveOwnerHero({ art, empty, items, now }: Props) {
  const live = useLiveUpNext(items);
  const item = useUpNextTitle(live[0]);
  if (!item) {
    return empty;
  }
  const index = items.findIndex(
    (candidate) => candidate.seriesId === item.seriesId,
  );
  const series = art[index] ?? null;
  return <OwnerHero item={item} now={now} series={series} />;
}
