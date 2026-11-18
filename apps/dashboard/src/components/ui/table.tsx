import type * as React from 'react';

import { cn } from '@/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  const classes = cn('w-full caption-bottom text-sm', className);
  return (
    <div
      className="relative w-full overflow-x-auto"
      data-slot="table-container"
    >
      <table className={classes} data-slot="table" {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  const classes = cn('[&_tr]:border-b', className);
  return <thead className={classes} data-slot="table-header" {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  const classes = cn('[&_tr:last-child]:border-0', className);
  return <tbody className={classes} data-slot="table-body" {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  const classes = cn('bg-muted/50 border-t [&>tr]:last:border-b-0', className);
  return <tfoot className={classes} data-slot="table-footer" {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  const classes = cn(
    'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
    className,
  );
  return <tr className={classes} data-slot="table-row" {...props} />;
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  const classes = cn(
    'h-12 px-3 text-left align-middle font-normal whitespace-nowrap [&:has([role=checkbox])]:pr-0',
    className,
  );
  return <th className={classes} data-slot="table-head" {...props} />;
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  const classes = cn(
    'p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
    className,
  );
  return <td className={classes} data-slot="table-cell" {...props} />;
}

export {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
