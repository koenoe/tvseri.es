import { memo, useMemo } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatCountString, type StatusCodes } from '@/lib/api-metrics';
import { CardMenuButton, DisabledCardMenuButton } from './metric-card';

type StatusCodePopoverProps = Readonly<{
  statusCodes?: StatusCodes;
}>;

type CodesPopoverProps = StatusCodePopoverProps &
  Readonly<{ includes: (status: number) => boolean }>;

// Bars start at 15% so a rare code still shows its count.
const MIN_BAR_PERCENTAGE = 15;

function totalOf(statusCodes: StatusCodes): number {
  return (
    statusCodes.success +
    statusCodes.redirect +
    statusCodes.clientError +
    statusCodes.serverError
  );
}

function CodeRow({
  code,
  count,
  total,
}: Readonly<{ code: string; count: number; total: number }>) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const barStyle = { width: `${Math.max(percentage, MIN_BAR_PERCENTAGE)}%` };
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-sm font-mono text-muted-foreground">
        {code}
      </span>
      <div className="relative h-6 w-24 overflow-hidden rounded-sm bg-muted/40">
        <div
          className="absolute inset-y-0 left-0 flex items-center bg-muted/80 px-1.5"
          style={barStyle}
        >
          <span className="tabular-nums text-white/80 text-sm whitespace-nowrap">
            {formatCountString(count)}
          </span>
        </div>
      </div>
    </div>
  );
}

CodeRow.displayName = 'CodeRow';

/** Counts per status code for the codes `includes` accepts, against all requests. */
function CodesPopover({ includes, statusCodes }: CodesPopoverProps) {
  const { items, total } = useMemo(() => {
    const codes = statusCodes?.codes;
    if (!statusCodes || !codes) return { items: [], total: 0 };

    const matching = Object.entries(codes)
      .filter(([code]) => includes(Number.parseInt(code, 10)))
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => Number(a.code) - Number(b.code));

    return { items: matching, total: totalOf(statusCodes) };
  }, [includes, statusCodes]);

  if (items.length === 0) {
    return <DisabledCardMenuButton />;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <CardMenuButton />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-2 p-3">
          {items.map(({ code, count }) => (
            <CodeRow code={code} count={count} key={code} total={total} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

CodesPopover.displayName = 'CodesPopover';

const isErrorCode = (status: number) => status >= 400;
const isSuccessCode = (status: number) => status >= 200 && status < 300;

function StatusCodePopoverComponent({ statusCodes }: StatusCodePopoverProps) {
  return <CodesPopover includes={isErrorCode} statusCodes={statusCodes} />;
}

StatusCodePopoverComponent.displayName = 'StatusCodePopover';

export const StatusCodePopover = memo(StatusCodePopoverComponent);

function SuccessCodesPopoverComponent({ statusCodes }: StatusCodePopoverProps) {
  return <CodesPopover includes={isSuccessCode} statusCodes={statusCodes} />;
}

SuccessCodesPopoverComponent.displayName = 'SuccessCodesPopover';

export const SuccessCodesPopover = memo(SuccessCodesPopoverComponent);
