import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';

type SortableColumn = Readonly<{
  getIsSorted: () => 'asc' | 'desc' | false;
  getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
}>;

function SortIndicator({
  isSorted,
}: Readonly<{ isSorted: 'asc' | 'desc' | false }>) {
  if (isSorted === 'asc') {
    return <ChevronUp className="ml-1 size-3" />;
  }
  if (isSorted === 'desc') {
    return <ChevronDown className="ml-1 size-3" />;
  }
  return (
    <ChevronsUpDown className="ml-1 size-3 opacity-0 group-hover/sort:opacity-100" />
  );
}

SortIndicator.displayName = 'SortIndicator';

export function SortableHeader({
  children,
  column,
}: Readonly<{ children: ReactNode; column: SortableColumn }>) {
  const handleClick = column.getToggleSortingHandler();
  const isSorted = column.getIsSorted();
  return (
    <button
      className="group/sort flex cursor-pointer items-center text-muted-foreground hover:text-foreground/80"
      onClick={handleClick}
      type="button"
    >
      {children}
      <SortIndicator isSorted={isSorted} />
    </button>
  );
}

SortableHeader.displayName = 'SortableHeader';
