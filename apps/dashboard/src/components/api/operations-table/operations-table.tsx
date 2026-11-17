import {
  flexRender,
  type PaginationState,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import { memo, useMemo } from 'react';

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
import { columns, type OperationStats } from './columns';

type OperationsTableProps = Readonly<{
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange: (sorting: SortingState) => void;
  operations: ReadonlyArray<OperationStats>;
  pagination: PaginationState;
  sorting: SortingState;
}>;

const OperationsTable = memo(function OperationsTable({
  onPaginationChange,
  onSortingChange,
  operations,
  pagination,
  sorting,
}: OperationsTableProps) {
  const maxRequestCount = useMemo(
    () => Math.max(...operations.map((op) => op.count), 1),
    [operations],
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
    data: operations as OperationStats[],
    features: apiTableFeatures,
    meta: { maxRequestCount },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    state: { pagination, sorting },
  });

  const rowCount = table.getFilteredRowModel().rows.length;

  return (
    <TableFrame>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className="px-3"
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
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <TableRow className="hover:bg-muted/50" key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell
                  className="px-3 py-2"
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-24 text-center" colSpan={columns.length}>
              No operations found.
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
});

OperationsTable.displayName = 'OperationsTable';

export { OperationsTable };
