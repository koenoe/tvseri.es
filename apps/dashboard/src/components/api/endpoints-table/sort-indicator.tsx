import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

type SortIndicatorProps = Readonly<{
  isSorted: 'asc' | 'desc' | false;
}>;

export function SortIndicator({ isSorted }: SortIndicatorProps) {
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
