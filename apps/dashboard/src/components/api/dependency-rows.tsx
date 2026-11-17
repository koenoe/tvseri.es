import type {
  DependencyOperationStats,
  DependencyStats,
} from '@tvseri.es/schemas';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { RouteLabel } from '@/components/route-label';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  formatDependencyName,
  formatErrorRate,
  formatLatency,
  getErrorRateColor,
  getLatencyColor,
  toStatusCodes,
} from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';
import { StatusCodePopover } from './status-code-popover';
import { RequestBar } from './table/request-bar';
import { ErrorRateSparkline, LatencySparkline } from './table/table-sparklines';

export const COLUMN_WIDTHS = {
  actions: 48,
  errorRate: 140,
  latency: 140,
  name: 260,
  requests: 140,
} as const;

type DependencyRowProps = Readonly<{
  history: ReadonlyArray<number> | undefined;
  isExpanded: boolean;
  maxRequestCount: number;
  name: string;
  onToggle: (name: string) => void;
  stats: DependencyStats;
}>;

export function DependencyRow({
  history,
  isExpanded,
  maxRequestCount,
  name,
  onToggle,
  stats,
}: DependencyRowProps) {
  const displayName = formatDependencyName(name);

  const handleToggle = useCallback(() => onToggle(name), [onToggle, name]);
  const latencyColor = STATUS_COLORS[getLatencyColor(stats.p75)].hsl;
  const errorRateColor = STATUS_COLORS[getErrorRateColor(stats.errorRate)].hsl;

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={handleToggle}
    >
      <TableCell
        className="px-3 py-2 font-medium"
        style={{ width: COLUMN_WIDTHS.name }}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {displayName}
        </div>
      </TableCell>
      <TableCell
        className="px-3 py-2"
        style={{ width: COLUMN_WIDTHS.requests }}
      >
        <RequestBar
          maxRequestCount={maxRequestCount}
          requestCount={stats.count}
        />
      </TableCell>
      <TableCell className="px-3 py-2" style={{ width: COLUMN_WIDTHS.latency }}>
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatLatency(stats.p75)}
          </span>
          <LatencySparkline color={latencyColor} values={history} />
        </div>
      </TableCell>
      <TableCell
        className="px-3 py-2"
        style={{ width: COLUMN_WIDTHS.errorRate }}
      >
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatErrorRate(stats.errorRate)}
          </span>
          <ErrorRateSparkline
            color={errorRateColor}
            errorRate={stats.errorRate}
            values={history}
          />
        </div>
      </TableCell>
      <TableCell
        className="px-3 py-2"
        style={{ width: COLUMN_WIDTHS.actions }}
      ></TableCell>
    </TableRow>
  );
}

type OperationRowProps = Readonly<{
  maxRequestCount: number;
  operation: DependencyOperationStats;
}>;

export function OperationRow({
  maxRequestCount,
  operation,
}: OperationRowProps) {
  const series = useMemo(() => {
    if (!operation.series || operation.series.length <= 1) return undefined;
    return operation.series;
  }, [operation.series]);

  const latencyValues = series?.map((point) => point.p75);
  const errorRateValues = series?.map((point) => point.errorRate);
  const isPath = operation.operation.startsWith('/');

  const statusCodes = useMemo(
    () => toStatusCodes(operation.codes),
    [operation.codes],
  );

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        className="truncate px-3 py-2 pl-9"
        style={{ width: COLUMN_WIDTHS.name }}
      >
        {isPath ? (
          <RouteLabel route={operation.operation} />
        ) : (
          operation.operation
        )}
      </TableCell>
      <TableCell
        className="px-3 py-2"
        style={{ width: COLUMN_WIDTHS.requests }}
      >
        <RequestBar
          maxRequestCount={maxRequestCount}
          requestCount={operation.count}
        />
      </TableCell>
      <TableCell className="px-3 py-2" style={{ width: COLUMN_WIDTHS.latency }}>
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatLatency(operation.p75)}
          </span>
          <LatencySparkline values={latencyValues} />
        </div>
      </TableCell>
      <TableCell
        className="px-3 py-2"
        style={{ width: COLUMN_WIDTHS.errorRate }}
      >
        <div className="flex items-center gap-3">
          <span className="w-14 tabular-nums text-muted-foreground">
            {formatErrorRate(operation.errorRate)}
          </span>
          <ErrorRateSparkline
            errorRate={operation.errorRate}
            values={errorRateValues}
          />
        </div>
      </TableCell>
      <TableCell className="px-3 py-2" style={{ width: COLUMN_WIDTHS.actions }}>
        <div className="flex justify-end">
          <StatusCodePopover statusCodes={statusCodes} />
        </div>
      </TableCell>
    </TableRow>
  );
}
