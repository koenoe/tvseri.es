import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { TableFrame } from '../table/table-frame';
import { TablePaginationSkeleton } from '../table/table-pagination';

export function EndpointsTableSkeleton() {
  return (
    <TableFrame>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-3" style={{ width: 320 }}>
            Route
          </TableHead>
          <TableHead className="px-3" style={{ width: 140 }}>
            Requests
          </TableHead>
          <TableHead className="px-3" style={{ width: 140 }}>
            Latency
          </TableHead>
          <TableHead className="px-3" style={{ width: 80 }}>
            Apdex
          </TableHead>
          <TableHead className="px-3" style={{ width: 140 }}>
            Error Rate
          </TableHead>
          <TableHead className="px-3" style={{ width: 120 }}>
            Dependencies
          </TableHead>
          <TableHead className="w-[1%] px-3" style={{ width: 32 }} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-10 rounded" />
                <Skeleton className="h-4 w-48" />
              </div>
            </TableCell>
            <TableCell className="px-3 py-2">
              <Skeleton className="h-6 w-16 rounded-sm" />
            </TableCell>
            <TableCell className="px-3 py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-12" />
              </div>
            </TableCell>
            <TableCell className="px-3 py-2">
              <Skeleton className="size-8 rounded-full" />
            </TableCell>
            <TableCell className="px-3 py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-12" />
              </div>
            </TableCell>
            <TableCell className="px-3 py-2">
              <div className="flex flex-wrap gap-1">
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </TableCell>
            <TableCell className="w-[1%] px-3 py-2">
              <div className="flex justify-end">
                <Skeleton className="size-4" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TablePaginationSkeleton colSpan={7} />
    </TableFrame>
  );
}

EndpointsTableSkeleton.displayName = 'EndpointsTableSkeleton';
