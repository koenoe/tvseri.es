'use client';

import { useState } from 'react';

import Link from 'next/link';
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
      {displayedItems.map((item, index) => (
        <Link
          key={itemKey(index)}
          className="hover:underline"
          href={itemHref(index)}
        >
          {itemLabel(index)}
          {index < displayedItems.length - 1 ? ',' : ''}
        </Link>
      ))}
      {!showAll && items.length > initialDisplayCount && (
        <button onClick={() => setShowAll(true)} className="hover:underline">
          + {items.length - initialDisplayCount} more
        </button>
      )}
    </p>
  );
}
