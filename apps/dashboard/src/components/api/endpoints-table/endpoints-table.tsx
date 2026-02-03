import { useNavigate } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import type { EndpointMetrics } from '@tvseri.es/schemas';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  const table = useReactTable({
    autoResetPageIndex: false,
    columns,
    data: endpoints as EndpointMetrics[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { maxRequestCount },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    state: { pagination, sorting },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const totalPages = Math.ceil(totalRows / pagination.pageSize);
  const currentPage = pagination.pageIndex + 1;

  const handleRowClick = useCallback(
    (endpoint: string) => {
      navigate({
        search: { endpoint },
        to: '/api/endpoints',
      });
    },
    [navigate],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
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
                key={row.id}
                onClick={() => handleRowClick(row.original.endpoint)}
              >
                {row.getVisibleCells().map((cell) => {
                  const isChevron = cell.column.id === 'chevron';
                  return (
                    <TableCell
                      className={isChevron ? 'w-[1%] px-3 py-2' : 'px-3 py-2'}
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell className="px-3" colSpan={columns.length}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Show</span>
                  <NativeSelect
                    className="[&_select]:cursor-pointer [&_select]:h-6 [&_select]:py-0 [&_select]:rounded [&_select]:bg-transparent! [&_select]:pl-2 [&_select]:pr-5 [&_select]:text-muted-foreground [&_svg]:right-1.5 [&_svg]:size-2.5 [&_svg]:text-muted-foreground"
                    onChange={(e) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                    value={pagination.pageSize}
                  >
                    <NativeSelectOption value={10}>10</NativeSelectOption>
                    <NativeSelectOption value={25}>25</NativeSelectOption>
                    <NativeSelectOption value={50}>50</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-1 tabular-nums text-muted-foreground">
                    {currentPage} of {totalPages}
                  </span>
                  <button
                    className="cursor-pointer rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                    type="button"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    className="cursor-pointer rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                    type="button"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

EndpointsTableComponent.displayName = 'EndpointsTable';

export const EndpointsTable = memo(EndpointsTableComponent);
