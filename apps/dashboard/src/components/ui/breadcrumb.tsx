import { ChevronRightIcon } from 'lucide-react';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  const classes = cn(className);
  return (
    <nav
      aria-label="breadcrumb"
      className={classes}
      data-slot="breadcrumb"
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  const classes = cn(
    'text-muted-foreground gap-1.5 text-sm sm:gap-2.5 flex flex-wrap items-center break-words',
    className,
  );
  return <ol className={classes} data-slot="breadcrumb-list" {...props} />;
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  const classes = cn('gap-1.5 inline-flex items-center', className);
  return <li className={classes} data-slot="breadcrumb-item" {...props} />;
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : 'a';

  const classes = cn('hover:text-foreground transition-colors', className);
  return <Comp className={classes} data-slot="breadcrumb-link" {...props} />;
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  const classes = cn('text-foreground font-normal', className);
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      className={classes}
      data-slot="breadcrumb-page"
      role="link"
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) {
  const classes = cn('[&>svg]:size-3.5', className);
  return (
    <li
      aria-hidden="true"
      className={classes}
      data-slot="breadcrumb-separator"
      role="presentation"
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
