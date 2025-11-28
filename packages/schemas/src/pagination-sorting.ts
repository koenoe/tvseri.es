export type SortDirection = 'asc' | 'desc';

export type SortBy = 'title' | 'createdAt' | 'position';

export type PaginationOptions = Readonly<{
  limit?: number;
  cursor?: string | null;
  sortBy?: SortBy;
  sortDirection?: SortDirection;
}>;
