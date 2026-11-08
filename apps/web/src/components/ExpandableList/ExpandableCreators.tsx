'use client';

import type { Person } from '@tvseri.es/schemas';
import { useCallback } from 'react';

import ExpandableList from './ExpandableList';

export default function ExpandableCreators({
  creators,
}: Readonly<{
  creators: ReadonlyArray<Readonly<Pick<Person, 'id' | 'name' | 'slug'>>>;
}>) {
  const itemHref = useCallback(
    (index: number) =>
      `/person/${creators[index]?.id}/${creators[index]?.slug}`,
    [creators],
  );

  const itemKey = useCallback(
    (index: number) => creators[index]?.id as number,
    [creators],
  );

  const itemLabel = useCallback(
    (index: number) => creators[index]?.name as string,
    [creators],
  );

  return (
    <ExpandableList
      initialDisplayCount={1}
      itemHref={itemHref}
      itemKey={itemKey}
      itemLabel={itemLabel}
      items={creators}
      label="Created by"
    />
  );
}
