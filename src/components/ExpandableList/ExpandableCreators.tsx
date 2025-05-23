'use client';

import { type TvSeries } from '@/types/tv-series';

import ExpandableList from './ExpandableList';

export default function ExpandableCreators({
  creators,
}: Readonly<{ creators: TvSeries['createdBy'] }>) {
  return (
    <ExpandableList
      items={creators}
      label="Created by"
      initialDisplayCount={2}
      itemKey={(index) => creators[index].id}
      itemLabel={(index) => creators[index].name}
      itemHref={(index) =>
        `/person/${creators[index].id}/${creators[index].slug}`
      }
    />
  );
}
