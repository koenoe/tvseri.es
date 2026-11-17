import type {
  DependencyOperationStats,
  DependencyStats,
} from '@tvseri.es/schemas';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatDependencyName,
  formatErrorRate,
  formatLatency,
  getErrorRateColor,
  getLatencyColor,
  sortDependencyKeys,
  toStatusCodes,
} from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';
import { RouteLabel } from './endpoint-label';
import { RequestBar } from './request-bar';
import { StatusCodePopover } from './status-code-popover';
import { ErrorRateSparkline, LatencySparkline } from './table-sparklines';

type DependenciesSectionProps = Readonly<{
  dependencies: Record<string, DependencyStats> | undefined;
  maxRequestCount?: number;
}>;

const COLUMN_WIDTHS = {
  actions: 48,
  errorRate: 140,
  latency: 140,
  name: 260,
  requests: 140,
} as const;

type DependencyRowProps = Readonly<{
  errorHistory: ReadonlyArray<number> | undefined;
  isExpanded: boolean;
  latencyHistory: ReadonlyArray<number> | undefined;
  maxRequestCount: number;
  name: string;
  onToggle: (name: string) => void;
  stats: DependencyStats;
}>;

function DependencyRow({
  errorHistory,
  isExpanded,
  latencyHistory,
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
          <LatencySparkline color={latencyColor} values={latencyHistory} />
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
            values={errorHistory}
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

function OperationRow({ maxRequestCount, operation }: OperationRowProps) {
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

function DependenciesSectionComponent({
  dependencies,
  maxRequestCount: maxRequestCountProp,
}: DependenciesSectionProps) {
  const sortedKeys = useMemo(
    () => (dependencies ? sortDependencyKeys(Object.keys(dependencies)) : []),
    [dependencies],
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(sortedKeys),
  );

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const maxRequestCount = useMemo(() => {
    if (maxRequestCountProp !== undefined) return maxRequestCountProp;
    if (!dependencies) return 1;
    return Math.max(...Object.values(dependencies).map((d) => d.count), 1);
  }, [dependencies, maxRequestCountProp]);

  if (!dependencies || sortedKeys.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="table-fixed text-sm [&_td]:py-2 [&_th]:h-10 [&_th]:py-2">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-3" style={{ width: COLUMN_WIDTHS.name }}>
              <span className="text-muted-foreground">Dependency</span>
            </TableHead>
            <TableHead
              className="px-3"
              style={{ width: COLUMN_WIDTHS.requests }}
            >
              <span className="text-muted-foreground">Requests</span>
            </TableHead>
            <TableHead
              className="px-3"
              style={{ width: COLUMN_WIDTHS.latency }}
            >
              <span className="text-muted-foreground">Latency</span>
            </TableHead>
            <TableHead
              className="px-3"
              style={{ width: COLUMN_WIDTHS.errorRate }}
            >
              <span className="text-muted-foreground">Error Rate</span>
            </TableHead>
            <TableHead
              className="px-3"
              style={{ width: COLUMN_WIDTHS.actions }}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedKeys.map((key) => {
            const stats = dependencies[key];
            if (!stats) return null;

            const latencyHistory =
              stats.history && stats.history.length > 1
                ? stats.history.map((point) => point.value)
                : undefined;

            const errorHistory =
              stats.history && stats.history.length > 1
                ? stats.history.map((point) => point.value)
                : undefined;

            const isExpanded = expanded.has(key);

            return (
              <Fragment key={key}>
                <DependencyRow
                  errorHistory={errorHistory}
                  isExpanded={isExpanded}
                  latencyHistory={latencyHistory}
                  maxRequestCount={maxRequestCount}
                  name={key}
                  onToggle={toggle}
                  stats={stats}
                />
                {isExpanded &&
                  stats.topOperations?.map((op) => (
                    <OperationRow
                      key={`${key}-${op.operation}`}
                      maxRequestCount={maxRequestCount}
                      operation={op}
                    />
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

DependenciesSectionComponent.displayName = 'DependenciesSection';

export const DependenciesSection = memo(DependenciesSectionComponent);
