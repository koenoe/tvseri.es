import { useNavigate } from '@tanstack/react-router';
import {
  flexRender,
  type PaginationState,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import type { EndpointMetrics } from '@tvseri.es/schemas';
import { memo, useCallback, useMemo } from 'react';

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { apiTableFeatures } from '../table/table-features';
import { TableFrame } from '../table/table-frame';
import { TablePagination } from '../table/table-pagination';
import { useControlledTableState } from '../table/use-controlled-table-state';
import { columns } from './columns';

type EndpointsTableProps = Readonly<{
  endpoints: ReadonlyArray<EndpointMetrics>;
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange: (sorting: SortingState) => void;
  pagination: PaginationState;
  sorting: SortingState;
}>;

function EndpointsTableComponent({
  endpoints,
  onPaginationChange,
  onSortingChange,
  pagination,
  sorting,
}: EndpointsTableProps) {
  const navigate = useNavigate();

  const maxRequestCount = useMemo(
    () => Math.max(...endpoints.map((e) => e.requestCount), 1),
    [endpoints],
  );

  const { handlePaginationChange, handleSortingChange } =
    useControlledTableState({
      onPaginationChange,
      onSortingChange,
      pagination,
      sorting,
    });

  const table = useTable({
    autoResetPageIndex: false,
    columns,
    data: endpoints as EndpointMetrics[],
    features: apiTableFeatures,
    meta: { maxRequestCount },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    state: { pagination, sorting },
  });

  const rowCount = table.getFilteredRowModel().rows.length;

  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      const endpoint = event.currentTarget.dataset.endpoint;
      if (!endpoint) {
        return;
      }
      navigate({
        search: { endpoint },
        to: '/api/endpoints',
      });
    },
    [navigate],
  );

  return (
    <TableFrame>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const isChevron = header.id === 'chevron';
              return (
                <TableHead
                  className={isChevron ? 'w-[1%] px-3' : 'px-3'}
                  key={header.id}
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              className="cursor-pointer"
              data-endpoint={row.original.endpoint}
              key={row.id}
              onClick={handleRowClick}
            >
              {row.getAllCells().map((cell) => {
                const isChevron = cell.column.id === 'chevron';
                return (
                  <TableCell
                    className={isChevron ? 'w-[1%] px-3 py-2' : 'px-3 py-2'}
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-24 text-center" colSpan={columns.length}>
              No endpoints found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      <TablePagination
        colSpan={columns.length}
        pagination={pagination}
        rowCount={rowCount}
        table={table}
      />
    </TableFrame>
  );
}

EndpointsTableComponent.displayName = 'EndpointsTable';

export const EndpointsTable = memo(EndpointsTableComponent);
