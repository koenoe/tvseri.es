import { getRouteApi, useNavigate } from '@tanstack/react-router';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { lazy, memo, Suspense, useCallback, useMemo } from 'react';

import { useApiMetricsEndpoints } from '@/lib/api/hooks';
import { DEFAULT_PAGE_SIZE } from '../table/table-pagination';
import { EndpointsTableSkeleton } from './skeleton';

const EndpointsTable = lazy(() =>
  import('./endpoints-table').then((mod) => ({
    default: mod.EndpointsTable,
  })),
);

const route = getRouteApi('/api/');

/** The endpoints table, with its sort and page kept in the URL. */
const EndpointsSection = memo(function EndpointsSection({
  days,
}: Readonly<{ days: number }>) {
  const navigate = useNavigate();
  const { pageIndex, pageSize, sortColumn, sortDirection } = route.useSearch({
    select: (s) => ({
      pageIndex: s.pageIndex,
      pageSize: s.pageSize,
      sortColumn: s.sortColumn,
      sortDirection: s.sortDirection,
    }),
  });

  const { data: endpointsData, isLoading } = useApiMetricsEndpoints({ days });

  const sorting: SortingState = useMemo(
    () =>
      sortColumn
        ? [{ desc: sortDirection === 'desc', id: sortColumn }]
        : [{ desc: true, id: 'requests' }],
    [sortColumn, sortDirection],
  );

  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: pageIndex ?? 0,
      pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
    }),
    [pageIndex, pageSize],
  );

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      const firstSort = newSorting[0];
      void navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          sortColumn: firstSort?.id,
          sortDirection: firstSort?.desc ? 'desc' : 'asc',
        }),
        to: '.',
      });
    },
    [navigate],
  );

  // Defaults stay out of the URL.
  const handlePaginationChange = useCallback(
    (newPagination: PaginationState) => {
      void navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          pageIndex: newPagination.pageIndex || undefined,
          pageSize:
            newPagination.pageSize !== DEFAULT_PAGE_SIZE
              ? newPagination.pageSize
              : undefined,
        }),
        to: '.',
      });
    },
    [navigate],
  );

  if (isLoading) {
    return <EndpointsTableSkeleton />;
  }

  const endpoints = endpointsData?.endpoints ?? [];

  return (
    <Suspense fallback={<EndpointsTableSkeleton />}>
      <EndpointsTable
        endpoints={endpoints}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        pagination={pagination}
        sorting={sorting}
      />
    </Suspense>
  );
});

EndpointsSection.displayName = 'EndpointsSection';

export { EndpointsSection };
