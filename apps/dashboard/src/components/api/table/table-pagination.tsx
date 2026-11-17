import type { PaginationState } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ChangeEvent, useCallback } from 'react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableFooter, TableRow } from '@/components/ui/table';

type PaginatedTable = Readonly<{
  getCanNextPage: () => boolean;
  getCanPreviousPage: () => boolean;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (pageSize: number) => void;
}>;

type TablePaginationProps = Readonly<{
  colSpan: number;
  pagination: PaginationState;
  rowCount: number;
  table: PaginatedTable;
}>;

const PAGE_BUTTON_CLASSES =
  'cursor-pointer rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50';

export function TablePagination({
  colSpan,
  pagination,
  rowCount,
  table,
}: TablePaginationProps) {
  const totalPages = Math.ceil(rowCount / pagination.pageSize);
  const currentPage = pagination.pageIndex + 1;
  const isFirstPage = !table.getCanPreviousPage();
  const isLastPage = !table.getCanNextPage();

  const handlePageSizeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      table.setPageSize(Number(event.target.value));
    },
    [table],
  );
  const handlePreviousPage = useCallback(() => table.previousPage(), [table]);
  const handleNextPage = useCallback(() => table.nextPage(), [table]);

  return (
    <TableFooter className="bg-transparent">
      <TableRow className="hover:bg-transparent">
        <TableCell className="px-3" colSpan={colSpan}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Show</span>
              <NativeSelect
                aria-label="Rows per page"
                className="[&_select]:cursor-pointer [&_select]:h-6 [&_select]:py-0 [&_select]:rounded [&_select]:bg-transparent! [&_select]:pl-2 [&_select]:pr-5 [&_select]:text-muted-foreground [&_svg]:right-1.5 [&_svg]:size-2.5 [&_svg]:text-muted-foreground"
                onChange={handlePageSizeChange}
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
                aria-label="Previous page"
                className={PAGE_BUTTON_CLASSES}
                disabled={isFirstPage}
                onClick={handlePreviousPage}
                type="button"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                aria-label="Next page"
                className={PAGE_BUTTON_CLASSES}
                disabled={isLastPage}
                onClick={handleNextPage}
                type="button"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

TablePagination.displayName = 'TablePagination';

export function TablePaginationSkeleton({
  colSpan,
}: Readonly<{ colSpan: number }>) {
  return (
    <TableFooter className="bg-transparent">
      <TableRow className="hover:bg-transparent">
        <TableCell className="px-3" colSpan={colSpan}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="size-6 rounded" />
              <Skeleton className="size-6 rounded" />
            </div>
          </div>
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

TablePaginationSkeleton.displayName = 'TablePaginationSkeleton';
