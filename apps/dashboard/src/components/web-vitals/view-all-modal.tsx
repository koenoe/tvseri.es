import { memo, useCallback, useState } from 'react';

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
import { useMediaQuery } from '@/hooks/use-media-query';
import type { GroupedMetricData } from '@/lib/api/utils';
import type { RatingStatus } from '@/lib/web-vitals';
import {
  type FilterValue,
  ItemsList,
  type MetricItemWithStatus,
  ModalHeading,
} from './view-all-parts';

type ViewAllModalProps = Readonly<{
  data: GroupedMetricData;
  initialFilter?: RatingStatus;
  metricName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  variant?: 'country' | 'route';
}>;

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
  // Opening from another status column starts on that status.
  const [shownFilter, setShownFilter] = useState(initialFilter);
  if (shownFilter !== initialFilter) {
    setShownFilter(initialFilter);
    setActiveFilter(initialFilter ?? 'all');
  }
  const isNarrowViewport = useMediaQuery('(max-width: 1023px)');

  const allItems: ReadonlyArray<MetricItemWithStatus> = [
    ...data.great.map((item) => ({ ...item, status: 'great' as const })),
    ...data.needsImprovement.map((item) => ({
      ...item,
      status: 'needsImprovement' as const,
    })),
    ...data.poor.map((item) => ({ ...item, status: 'poor' as const })),
  ].sort((a, b) => b.pageViews - a.pageViews);

  const filteredItems =
    activeFilter === 'all'
      ? allItems
      : allItems.filter((item) => item.status === activeFilter);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setActiveFilter(initialFilter ?? 'all');
      }
      onOpenChange(newOpen);
    },
    [initialFilter, onOpenChange],
  );

  const handleClose = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );

  const handleFilterChange = useCallback((value: string) => {
    // ToggleGroup returns empty string when deselecting, keep current value
    if (value) {
      setActiveFilter(value as FilterValue);
    }
  }, []);

  const heading = (
    <ModalHeading
      activeFilter={activeFilter}
      data={data}
      metricName={metricName}
      onFilterChange={handleFilterChange}
      title={title}
    />
  );
  const itemsList = <ItemsList items={filteredItems} variant={variant} />;

  if (!isNarrowViewport) {
    return (
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent
          className="h-[70vh] max-w-xl overflow-hidden flex flex-col gap-0 p-0 bg-card"
          hideCloseButton
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-6 leading-none">
              {heading}
            </DialogTitle>
          </DialogHeader>

          {itemsList}

          <DialogFooter className="px-4 py-4 border-t">
            <Button
              className="w-full cursor-pointer rounded-lg"
              onClick={handleClose}
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
        <DrawerHeader className="border-b px-4 py-3 text-left">
          <DrawerTitle className="flex items-center gap-6 leading-none">
            {heading}
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
