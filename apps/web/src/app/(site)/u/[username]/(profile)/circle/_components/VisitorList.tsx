'use client';

import type { Page } from '@tvseri.es/schemas';

import { usersGlyph } from '@/components/ui/icon/glyphs';
import type { FollowItem } from '@/lib/profile/views';

import EmptyState from '../../_components/blocks/EmptyState';
import InfiniteScroll from '../../_components/pagination/InfiniteScroll';
import PaginationNotice from '../../_components/pagination/PaginationNotice';
import usePaginated from '../../_lib/pagination/usePaginated';
import { LIST } from './rowBoxes';
import VisitorPersonRow from './VisitorPersonRow';

const getId = (person: FollowItem) => person.id;

const PEOPLE_LIST = `${LIST} mt-4`;

/**
 * One of someone else's two Circle lists, 24 rows a page, the next page
 * loading as you scroll (each row with what that person is watching).
 */
export default function VisitorList({
  empty,
  endpoint,
  first,
  marksFirst = false,
}: Readonly<{
  empty: string;
  /** `/api/u/:username/social/:type` */
  endpoint: string;
  first: Page<FollowItem>;
  /** The page's first list: its first row carries the placeholder spec's marker */
  marksFirst?: boolean;
}>) {
  const { canLoadMore, items, loadMore, status } = usePaginated({
    endpoint,
    getId,
    initialCursor: first.nextCursor,
    initialItems: first.items,
    restoreKey: endpoint,
  });
  if (items.length === 0) {
    return <EmptyState className="mt-4" glyph={usersGlyph} title={empty} />;
  }
  return (
    <>
      <InfiniteScroll hasMore={canLoadMore} loadMore={loadMore}>
        <ul className={PEOPLE_LIST}>
          {items.map((person, index) => {
            const first = marksFirst && index === 0;
            return (
              <VisitorPersonRow first={first} key={person.id} person={person} />
            );
          })}
        </ul>
      </InfiniteScroll>
      <PaginationNotice onRetry={loadMore} status={status} />
    </>
  );
}
