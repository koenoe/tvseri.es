'use client';

import { type TvSeries } from '@tvseri.es/types';

import ExpandableList from './ExpandableList';

export default function ExpandableCreators({
  creators,
}: Readonly<{ creators: TvSeries['createdBy'] }>) {
  return (
    <ExpandableList
      items={creators}
      label="Created by"
      initialDisplayCount={1}
      itemKey={(index) => creators[index]?.id as number}
      itemLabel={(index) => creators[index]?.name as string}
      itemHref={(index) =>
        `/person/${creators[index]?.id}/${creators[index]?.slug}`
      }
    />
  );
}
