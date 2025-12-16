import { CircleCheck } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { GroupedMetricData, MetricItem } from '@/lib/api/utils';
import {
  type RatingStatus,
  STATUS_COLORS,
  STATUS_ICONS,
} from '@/lib/web-vitals';

import { MetricListItem } from './metric-list-item';

type ViewAllModalProps = Readonly<{
  data: GroupedMetricData;
  initialFilter?: RatingStatus;
  metricName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  variant?: 'country' | 'route';
}>;

type MetricItemWithStatus = MetricItem & { status: RatingStatus };

type FilterValue = 'all' | RatingStatus;

const FILTER_ORDER: ReadonlyArray<RatingStatus> = [
  'great',
  'needsImprovement',
  'poor',
];

function ViewAllModalComponent({
  data,
  initialFilter,
  metricName,
  onOpenChange,
  open,
  title,
  variant = 'route',
}: ViewAllModalProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>(
    initialFilter ?? 'all',
  );
  const isNarrowViewport = useMediaQuery('(max-width: 1023px)');

  // Sync activeFilter when initialFilter changes (e.g., opening from different status)
  useEffect(() => {
    setActiveFilter(initialFilter ?? 'all');
  }, [initialFilter]);

  // Combine all items with their status
  const allItems: ReadonlyArray<MetricItemWithStatus> = [
    ...data.great.map((item) => ({ ...item, status: 'great' as const })),
    ...data.needsImprovement.map((item) => ({
      ...item,
      status: 'needsImprovement' as const,
    })),
    ...data.poor.map((item) => ({ ...item, status: 'poor' as const })),
  ].sort((a, b) => b.pageViews - a.pageViews);

  // Filter items based on active filter ('all' = show all)
  const filteredItems =
    activeFilter === 'all'
      ? allItems
      : allItems.filter((item) => item.status === activeFilter);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset filter when closing
      setActiveFilter(initialFilter ?? 'all');
    }
    onOpenChange(newOpen);
  };

  const handleFilterChange = (value: string) => {
    // ToggleGroup returns empty string when deselecting, keep current value
    if (value) {
      setActiveFilter(value as FilterValue);
    }
  };

  const filterToggle = (
    <ToggleGroup
      className="rounded-lg!"
      onValueChange={handleFilterChange}
      type="single"
      value={activeFilter}
      variant="outline"
    >
      <ToggleGroupItem
        className="h-8 px-3 first:rounded-l-lg! last:rounded-r-lg!"
        size="sm"
        value="all"
      >
        All
      </ToggleGroupItem>
      {FILTER_ORDER.map((status) => {
        const Icon = STATUS_ICONS[status];
        const count = data[status].length;

        return (
          <ToggleGroupItem
            className="size-8 p-0 last:rounded-r-lg!"
            key={status}
            size="sm"
            title={`${status} (${count})`}
            value={status}
          >
            <Icon className={`size-4 ${STATUS_COLORS[status].text}`} />
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );

  const itemsList = (
    <div className="overflow-y-auto flex-1 p-4">
      {filteredItems.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <CircleCheck className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No scores found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => (
            <MetricListItem
              key={item.label}
              label={item.label}
              pageViews={item.pageViews}
              StatusIcon={STATUS_ICONS[item.status]}
              statusColor={STATUS_COLORS[item.status].text}
              value={item.value}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (!isNarrowViewport) {
    return (
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent
          className="h-[70vh] max-w-xl overflow-hidden flex flex-col gap-0 p-0 bg-card"
          hideCloseButton
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle className="flex items-center gap-6 leading-none">
              <span>{title}</span>
              <span className="ml-auto text-sm font-normal text-muted-foreground leading-none">
                {metricName}
              </span>
              {filterToggle}
            </DialogTitle>
          </DialogHeader>

          {itemsList}

          <DialogFooter className="px-4 py-4 border-t">
            <Button
              className="w-full cursor-pointer rounded-lg"
              onClick={() => handleOpenChange(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <DrawerContent className="max-h-[85vh] bg-card">
        <DrawerHeader className="border-b p-4 text-left">
          <DrawerTitle className="flex items-center gap-6 leading-none">
            <span>{title}</span>
            <span className="ml-auto text-sm font-normal text-muted-foreground leading-none">
              {metricName}
            </span>
            {filterToggle}
          </DrawerTitle>
        </DrawerHeader>

        {itemsList}

        <DrawerFooter className="border-t p-4">
          <DrawerClose asChild>
            <Button
              className="w-full cursor-pointer rounded-lg"
              variant="outline"
            >
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

ViewAllModalComponent.displayName = 'ViewAllModal';
export const ViewAllModal = memo(ViewAllModalComponent);

// Hook to manage modal state
export function useViewAllModal() {
  const [modalState, setModalState] = useState<{
    data: GroupedMetricData;
    initialFilter?: RatingStatus;
    metricName: string;
    open: boolean;
    title: string;
    variant: 'country' | 'route';
  }>({
    data: { great: [], needsImprovement: [], poor: [] },
    metricName: '',
    open: false,
    title: '',
    variant: 'route',
  });

  const openModal = (
    data: GroupedMetricData,
    title: string,
    metricName: string,
    variant: 'country' | 'route' = 'route',
    initialFilter?: RatingStatus,
  ) => {
    setModalState({
      data,
      initialFilter,
      metricName,
      open: true,
      title,
      variant,
    });
  };

  const setOpen = (open: boolean) => {
    setModalState((prev) => ({ ...prev, open }));
  };

  return {
    modalState,
    openModal,
    setOpen,
  };
}
