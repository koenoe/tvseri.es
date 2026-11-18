import type { ReactNode } from 'react';

import { Table } from '@/components/ui/table';

/** The bordered, fixed-layout shell every API table and its skeleton share. */
export function TableFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
        {children}
      </Table>
    </div>
  );
}

TableFrame.displayName = 'TableFrame';
