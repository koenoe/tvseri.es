import { cx } from 'class-variance-authority';
import type { ComponentProps } from 'react';

const Table = ({ className, ref, ...props }: ComponentProps<'table'>) => (
  <div
    className={cx(
      'relative w-full overflow-auto rounded-md border border-neutral-700 bg-neutral-900 [&_*]:border-neutral-700',
      className,
    )}
  >
    <table
      className="w-full caption-bottom text-sm [&>tbody>tr:hover]:bg-neutral-800 [&>tbody>tr]:bg-neutral-900"
      ref={ref}
      {...props}
    />
  </div>
);
Table.displayName = 'Table';

const TableHeader = ({ className, ref, ...props }: ComponentProps<'thead'>) => (
  <thead
    className={cx('bg-neutral-800 [&_tr]:border-b', className)}
    ref={ref}
    {...props}
  />
);
TableHeader.displayName = 'TableHeader';

const TableBody = ({ className, ref, ...props }: ComponentProps<'tbody'>) => (
  <tbody
    className={cx('[&_tr:last-child]:border-0', className)}
    ref={ref}
    {...props}
  />
);
TableBody.displayName = 'TableBody';

const TableFooter = ({ className, ref, ...props }: ComponentProps<'tfoot'>) => (
  <tfoot
    className={cx('border-t font-medium [&>tr]:last:border-b-0', className)}
    ref={ref}
    {...props}
  />
);
TableFooter.displayName = 'TableFooter';

const TableRow = ({ className, ref, ...props }: ComponentProps<'tr'>) => (
  <tr
    className={cx('border-b transition-colors', className)}
    ref={ref}
    {...props}
  />
);
TableRow.displayName = 'TableRow';

const TableHead = ({ className, ref, ...props }: ComponentProps<'th'>) => (
  <th
    className={cx(
      'whitespace-nowrap border-r p-3 text-left align-middle font-medium last:border-r-0 [&:has([role=checkbox])]:pr-0',
      className,
    )}
    ref={ref}
    {...props}
  />
);
TableHead.displayName = 'TableHead';

const TableCell = ({ className, ref, ...props }: ComponentProps<'td'>) => (
  <td
    className={cx(
      'border-r p-3 align-middle last:border-r-0 [&:has([role=checkbox])]:pr-0',
      className,
    )}
    ref={ref}
    {...props}
  />
);
TableCell.displayName = 'TableCell';

const TableCaption = ({
  className,
  ref,
  ...props
}: ComponentProps<'caption'>) => (
  <caption className={cx('mt-4 text-sm', className)} ref={ref} {...props} />
);
TableCaption.displayName = 'TableCaption';

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
