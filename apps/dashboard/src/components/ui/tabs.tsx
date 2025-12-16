import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { type ComponentProps, forwardRef } from 'react';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={cn(
        'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col max-lg:flex-col',
        className,
      )}
      data-orientation={orientation}
      data-slot="tabs"
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col max-lg:flex-row! max-lg:items-stretch! max-lg:justify-start!',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        card: 'gap-0 bg-transparent rounded-xl border overflow-hidden min-w-56 max-lg:w-full max-lg:overflow-x-auto max-lg:scrollbar-hide max-lg:rounded-xl max-lg:min-w-0',
        default:
          'rounded-4xl p-0.75 group-data-horizontal/tabs:h-9 group-data-vertical/tabs:rounded-2xl bg-muted',
        line: 'gap-1 bg-transparent rounded-none',
      },
    },
  },
);

type TabsListProps = ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>;

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <TabsPrimitive.List
        className={cn(tabsListVariants({ variant }), className)}
        data-slot="tabs-list"
        data-variant={variant}
        ref={ref}
        {...props}
      />
    );
  },
);

TabsList.displayName = 'TabsList';

function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "cursor-pointer gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium group-data-vertical/tabs:px-2.5 group-data-vertical/tabs:py-1.5 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        // Line variant - uses after for indicator
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:after:transition-opacity group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:-bottom-1.25 group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:inset-y-0 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:-right-1 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        // Card variant - desktop (vertical) - left indicator using before
        'group-data-[variant=card]/tabs-list:rounded-none group-data-[variant=card]/tabs-list:border-0 group-data-[variant=card]/tabs-list:border-b group-data-[variant=card]/tabs-list:border-border group-data-[variant=card]/tabs-list:last:border-b-0 group-data-[variant=card]/tabs-list:px-5 group-data-[variant=card]/tabs-list:py-5 group-data-[variant=card]/tabs-list:h-auto group-data-[variant=card]/tabs-list:justify-start group-data-[variant=card]/tabs-list:text-left group-data-[variant=card]/tabs-list:flex-col group-data-[variant=card]/tabs-list:items-start',
        'group-data-[variant=card]/tabs-list:before:absolute group-data-[variant=card]/tabs-list:before:left-0 group-data-[variant=card]/tabs-list:before:top-0 group-data-[variant=card]/tabs-list:before:bottom-0 group-data-[variant=card]/tabs-list:before:w-0.5 group-data-[variant=card]/tabs-list:before:bg-transparent group-data-[variant=card]/tabs-list:before:transition-colors group-data-[variant=card]/tabs-list:data-active:before:bg-primary',
        // Card variant - mobile (horizontal) - bottom indicator using after, border-right between items
        'max-lg:group-data-[variant=card]/tabs-list:flex-col max-lg:group-data-[variant=card]/tabs-list:items-start max-lg:group-data-[variant=card]/tabs-list:border-b-0 max-lg:group-data-[variant=card]/tabs-list:border-r max-lg:group-data-[variant=card]/tabs-list:last:border-r-0 max-lg:group-data-[variant=card]/tabs-list:px-4 max-lg:group-data-[variant=card]/tabs-list:py-3 max-lg:group-data-[variant=card]/tabs-list:shrink-0',
        // Mobile card: hide left indicator (before), show bottom indicator (after)
        'max-lg:group-data-[variant=card]/tabs-list:before:hidden',
        "max-lg:group-data-[variant=card]/tabs-list:after:content-[''] max-lg:group-data-[variant=card]/tabs-list:after:absolute max-lg:group-data-[variant=card]/tabs-list:after:bottom-0 max-lg:group-data-[variant=card]/tabs-list:after:left-0 max-lg:group-data-[variant=card]/tabs-list:after:right-0 max-lg:group-data-[variant=card]/tabs-list:after:h-0.5 max-lg:group-data-[variant=card]/tabs-list:after:bg-transparent max-lg:group-data-[variant=card]/tabs-list:data-active:after:bg-primary",
        // Active states
        'data-active:bg-background dark:data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 data-active:text-foreground',
        'group-data-[variant=card]/tabs-list:data-active:bg-transparent group-data-[variant=card]/tabs-list:data-active:border-b group-data-[variant=card]/tabs-list:data-active:border-border group-data-[variant=card]/tabs-list:data-active:last:border-b-0 group-data-[variant=card]/tabs-list:dark:data-active:bg-transparent',
        'max-lg:group-data-[variant=card]/tabs-list:data-active:border-b-0 max-lg:group-data-[variant=card]/tabs-list:data-active:border-r max-lg:group-data-[variant=card]/tabs-list:data-active:last:border-r-0',
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('text-sm flex-1 outline-none', className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
