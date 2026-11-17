import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import { useCallback } from 'react';

type ControlledTableState = Readonly<{
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange: (sorting: SortingState) => void;
  pagination: PaginationState;
  sorting: SortingState;
}>;

/** Resolves the table's updater functions against the state its owner holds. */
export function useControlledTableState({
  onPaginationChange,
  onSortingChange,
  pagination,
  sorting,
}: ControlledTableState) {
  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(sorting)
          : updaterOrValue;
      onSortingChange(newSorting);
    },
    [onSortingChange, sorting],
  );

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updaterOrValue) => {
      const newPagination =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(pagination)
          : updaterOrValue;
      onPaginationChange(newPagination);
    },
    [onPaginationChange, pagination],
  );

  return { handlePaginationChange, handleSortingChange };
}
