import { MoreVertical } from 'lucide-react';
import { memo, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatCountString } from '@/lib/api-metrics';

type StatusCodes = Readonly<{
  clientError: number;
  codes?: Readonly<Record<string, number>>;
  redirect: number;
  serverError: number;
  success: number;
}>;

type StatusCodePopoverProps = Readonly<{
  statusCodes?: StatusCodes;
}>;

type StatusCodeItem = Readonly<{
  code: string;
  count: number;
}>;

function isErrorCode(code: string): boolean {
  const num = Number.parseInt(code, 10);
  return num >= 400;
}

function StatusCodePopoverComponent({ statusCodes }: StatusCodePopoverProps) {
  const { items, total } = useMemo(() => {
    const codes = statusCodes?.codes;
    if (!codes) return { items: [], total: 0 };

    const parsed: StatusCodeItem[] = [];
    for (const [code, count] of Object.entries(codes)) {
      if (isErrorCode(code)) {
        parsed.push({ code, count });
      }
    }

    parsed.sort((a, b) => Number(a.code) - Number(b.code));

    const totalRequests = statusCodes
      ? statusCodes.success +
        statusCodes.redirect +
        statusCodes.clientError +
        statusCodes.serverError
      : 0;

    return { items: parsed, total: totalRequests };
  }, [statusCodes]);

  if (items.length === 0) {
    return (
      <Button
        className="text-muted-foreground"
        disabled
        size="icon-sm"
        variant="ghost"
      >
        <MoreVertical className="size-4" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="text-muted-foreground cursor-pointer data-[state=open]:bg-input/50"
          size="icon-sm"
          variant="ghost"
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-2 p-3">
          {items.map(({ code, count }) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div className="flex items-center gap-3" key={code}>
                <span className="w-8 text-sm font-mono text-muted-foreground">
                  {code}
                </span>
                <div className="relative h-6 w-24 overflow-hidden rounded-sm bg-muted/40">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center bg-muted/80 px-1.5"
                    style={{ width: `${Math.max(percentage, 15)}%` }}
                  >
                    <span className="tabular-nums text-white/80 text-sm whitespace-nowrap">
                      {formatCountString(count)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

StatusCodePopoverComponent.displayName = 'StatusCodePopover';

export const StatusCodePopover = memo(StatusCodePopoverComponent);

function isSuccessCode(code: string): boolean {
  const num = Number.parseInt(code, 10);
  return num >= 200 && num < 300;
}

function SuccessCodesPopoverComponent({ statusCodes }: StatusCodePopoverProps) {
  const { items, total } = useMemo(() => {
    const codes = statusCodes?.codes;
    if (!codes) return { items: [], total: 0 };

    const parsed: StatusCodeItem[] = [];
    for (const [code, count] of Object.entries(codes)) {
      if (isSuccessCode(code)) {
        parsed.push({ code, count });
      }
    }

    parsed.sort((a, b) => Number(a.code) - Number(b.code));

    const totalRequests = statusCodes
      ? statusCodes.success +
        statusCodes.redirect +
        statusCodes.clientError +
        statusCodes.serverError
      : 0;

    return { items: parsed, total: totalRequests };
  }, [statusCodes]);

  if (items.length === 0) {
    return (
      <Button
        className="text-muted-foreground"
        disabled
        size="icon-sm"
        variant="ghost"
      >
        <MoreVertical className="size-4" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="text-muted-foreground cursor-pointer data-[state=open]:bg-input/50"
          size="icon-sm"
          variant="ghost"
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-2 p-3">
          {items.map(({ code, count }) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div className="flex items-center gap-3" key={code}>
                <span className="w-8 text-sm font-mono text-muted-foreground">
                  {code}
                </span>
                <div className="relative h-6 w-24 overflow-hidden rounded-sm bg-muted/40">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center bg-muted/80 px-1.5"
                    style={{ width: `${Math.max(percentage, 15)}%` }}
                  >
                    <span className="tabular-nums text-white/80 text-sm whitespace-nowrap">
                      {formatCountString(count)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

SuccessCodesPopoverComponent.displayName = 'SuccessCodesPopover';

export const SuccessCodesPopover = memo(SuccessCodesPopoverComponent);
