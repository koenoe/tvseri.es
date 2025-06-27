'use client';

import type { TvSeries } from '@tvseri.es/types';

import ExpandableList from './ExpandableList';

export default function ExpandableCreators({
  creators,
}: Readonly<{ creators: TvSeries['createdBy'] }>) {
  return (
    <ExpandableList
      initialDisplayCount={1}
      itemHref={(index) =>
        `/person/${creators[index]?.id}/${creators[index]?.slug}`
      }
      itemKey={(index) => creators[index]?.id as number}
      itemLabel={(index) => creators[index]?.name as string}
      items={creators}
      label="Created by"
    />
  );
}
