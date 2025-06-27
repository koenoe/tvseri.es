import { cx } from 'class-variance-authority';
import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
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
  ),
);
Table.displayName = 'Table';

const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    className={cx('bg-neutral-800 [&_tr]:border-b', className)}
    ref={ref}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    className={cx('[&_tr:last-child]:border-0', className)}
    ref={ref}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    className={cx('border-t font-medium [&>tr]:last:border-b-0', className)}
    ref={ref}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    className={cx('border-b transition-colors', className)}
    ref={ref}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    className={cx(
      'whitespace-nowrap border-r p-3 text-left align-middle font-medium last:border-r-0 [&:has([role=checkbox])]:pr-0',
      className,
    )}
    ref={ref}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    className={cx(
      'border-r p-3 align-middle last:border-r-0 [&:has([role=checkbox])]:pr-0',
      className,
    )}
    ref={ref}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption className={cx('mt-4 text-sm', className)} ref={ref} {...props} />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
