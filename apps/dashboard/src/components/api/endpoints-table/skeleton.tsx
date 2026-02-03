import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function EndpointsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
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
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell className="px-3" colSpan={7}>
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
      </Table>
    </div>
  );
}

EndpointsTableSkeleton.displayName = 'EndpointsTableSkeleton';
