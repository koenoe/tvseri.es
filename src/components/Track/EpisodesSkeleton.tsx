import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/Table';

export default function EpisodesSkeleton() {
  return (
    <div className="relative w-full animate-pulse">
      <Table className="h-full max-h-[calc(100vh-24rem)] text-xs md:max-h-[calc(100vh-33rem)]">
        <TableHeader className="sticky top-0 z-10 border-b">
          <TableRow>
            <TableHead className="w-10">
              <div className="size-3 bg-white/10" />
            </TableHead>
            <TableHead>
              <div className="flex h-11 items-center">
                <div className="h-5 w-full bg-white/10" />
              </div>
            </TableHead>
            <TableHead className="w-40">
              <div className="flex h-11 items-center">
                <div className="h-5 w-full bg-white/10" />
              </div>
            </TableHead>
            <TableHead className="w-24">
              <div className="flex h-11 items-center">
                <div className="h-5 w-full bg-white/10" />
              </div>
            </TableHead>
            <TableHead className="w-40">
              <div className="flex h-11 items-center">
                <div className="h-5 w-full bg-white/10" />
              </div>
            </TableHead>
            <TableHead className="w-56">
              <div className="flex h-11 items-center">
                <div className="h-5 w-full bg-white/10" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 20 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell>
                <div className="size-3 bg-white/5" />
              </TableCell>
              {Array.from({ length: 5 }).map((_, cellIndex) => (
                <TableCell key={cellIndex}>
                  <div className="flex h-7 items-center">
                    <div className="h-5 w-full bg-white/5" />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-10 flex w-full items-center gap-x-4">
        <div className="flex h-7 items-center gap-x-2">
          <div className="h-7 w-10 rounded bg-white/10" />
          <div className="h-4 w-14 bg-white/5" />
        </div>
        <div className="ml-auto flex gap-x-4">
          <div className="h-11 w-24 rounded-3xl bg-white/5" />
          <div className="h-11 w-24 rounded-3xl bg-white/20" />
        </div>
      </div>
    </div>
  );
}
