import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { RatingStatus } from '@/lib/web-vitals';

import { StatusHeader } from './status-header';
import { StatusList } from './status-list';

type StatusConfig = Readonly<{
  Icon: LucideIcon;
  label: string;
  text: string;
  threshold: string;
}>;

type MetricItem = Readonly<{
  label: string;
  value: number | string;
}>;

type MetricData = Readonly<{
  great: ReadonlyArray<MetricItem>;
  needsImprovement: ReadonlyArray<MetricItem>;
  poor: ReadonlyArray<MetricItem>;
}>;

type StatusAccordionProps = Readonly<{
  className?: string;
  data: MetricData;
  defaultStatus?: RatingStatus;
  emptyMessages?: Readonly<Record<RatingStatus, string>>;
  onViewAll?: (status: RatingStatus) => void;
  statusConfig: Readonly<Record<RatingStatus, StatusConfig>>;
  variant?: 'country' | 'route';
}>;

const ACCORDION_ORDER: ReadonlyArray<{
  status: RatingStatus;
  value: string;
}> = [
  { status: 'poor', value: 'poor' },
  { status: 'needsImprovement', value: 'needs-improvement' },
  { status: 'great', value: 'great' },
];

const STATUS_TO_VALUE: Record<RatingStatus, string> = {
  great: 'great',
  needsImprovement: 'needs-improvement',
  poor: 'poor',
};

const DEFAULT_EMPTY_MESSAGES: Record<RatingStatus, string> = {
  great: 'No great scores',
  needsImprovement: 'No needs improvement scores',
  poor: 'No poor scores',
};

function StatusAccordionComponent({
  className,
  data,
  defaultStatus,
  emptyMessages,
  onViewAll,
  statusConfig,
  variant = 'route',
}: StatusAccordionProps) {
  const defaultValue = defaultStatus
    ? STATUS_TO_VALUE[defaultStatus]
    : undefined;

  return (
    <Accordion
      className={className}
      collapsible
      defaultValue={defaultValue}
      type="single"
    >
      {ACCORDION_ORDER.map(({ status, value }) => {
        const config = statusConfig[status];
        const items = data[status];
        const emptyMessage =
          emptyMessages?.[status] ?? DEFAULT_EMPTY_MESSAGES[status];
        const handleViewAll = onViewAll ? () => onViewAll(status) : undefined;

        return (
          <AccordionItem className="border-b-0" key={value} value={value}>
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex flex-1 items-center justify-between pr-2">
                <StatusHeader
                  Icon={config.Icon}
                  label={config.label}
                  showFontMedium={false}
                  textColorClass={config.text}
                  threshold={config.threshold}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0!">
              <div className="relative h-56 overflow-hidden px-4 pt-2">
                <StatusList
                  emptyMessage={emptyMessage}
                  items={items}
                  onViewAll={handleViewAll}
                  variant={variant}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

StatusAccordionComponent.displayName = 'StatusAccordion';
export const StatusAccordion = memo(StatusAccordionComponent);
