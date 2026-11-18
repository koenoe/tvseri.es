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

export function OperationsTableSkeleton() {
  return (
    <TableFrame>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-3" style={{ width: 300 }}>
            Operation
          </TableHead>
          <TableHead className="px-3" style={{ width: 140 }}>
            Requests
          </TableHead>
          <TableHead className="px-3" style={{ width: 140 }}>
            Latency
          </TableHead>
          <TableHead className="px-3" style={{ width: 140 }}>
            Error Rate
          </TableHead>
          <TableHead className="px-3" style={{ width: 48 }} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell className="px-3 py-2">
              <Skeleton className="h-4 w-48" />
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
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-12" />
              </div>
            </TableCell>
            <TableCell className="px-3 py-2">
              <div className="flex justify-end">
                <Skeleton className="size-6 rounded" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TablePaginationSkeleton colSpan={5} />
    </TableFrame>
  );
}

OperationsTableSkeleton.displayName = 'OperationsTableSkeleton';
