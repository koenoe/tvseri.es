import {
  type ColumnDef,
  columnSizingFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';

type ApiTableMeta = Readonly<{
  maxRequestCount?: number;
}>;

// The API tables sort and paginate client-side and size their columns. The sort
// functions are the ones `auto` picks for string and number columns.
export const apiTableFeatures = tableFeatures({
  columnSizingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
  tableMeta: metaHelper<ApiTableMeta>(),
});

export type ApiColumnDef<TData extends object> = ColumnDef<
  typeof apiTableFeatures,
  TData
>;
