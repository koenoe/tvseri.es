'use client';

import Link from 'next/link';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

export default function ExpandableList({
  className,
  items,
  label,
  initialDisplayCount,
  itemKey,
  itemLabel,
  itemHref,
}: Readonly<{
  className?: string;
  items: unknown[];
  label: string;
  initialDisplayCount: number;
  itemKey: (index: number) => string | number;
  itemLabel: (index: number) => string;
  itemHref: (index: number) => string;
}>) {
  const [showAll, setShowAll] = useState(false);
  const displayedItems = showAll ? items : items.slice(0, initialDisplayCount);

  return (
    <p
      className={twMerge(
        'flex flex-wrap items-center gap-x-1 font-medium leading-loose',
        className,
      )}
    >
      <span className="opacity-60">{label}:</span>
      {displayedItems.map((_item, index) => (
        <Link
          className="hover:underline"
          href={itemHref(index)}
          key={itemKey(index)}
        >
          {itemLabel(index)}
          {index < displayedItems.length - 1 ? ',' : ''}
        </Link>
      ))}
      {!showAll && items.length > initialDisplayCount && (
        <button className="hover:underline" onClick={() => setShowAll(true)}>
          + {items.length - initialDisplayCount} more
        </button>
      )}
    </p>
  );
}
