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
  formatCountString,
  formatDependencyName,
  formatErrorRate,
  formatLatency,
  getLatencyStatus,
  sortDependencyKeys,
} from '@/lib/api-metrics';
import { STATUS_COLORS } from '@/lib/status-colors';
import { RouteLabel } from './endpoint-label';

type DependenciesSectionProps = Readonly<{
  dependencies: Record<string, DependencyStats> | undefined;
  maxRequestCount?: number;
}>;

function getErrorRateColor(errorRate: number): string {
  if (errorRate < 1) return STATUS_COLORS.green.hsl;
  if (errorRate < 5) return STATUS_COLORS.amber.hsl;
  return STATUS_COLORS.red.hsl;
}

function getLatencyColor(p75: number): string {
  const status = getLatencyStatus(p75);
  if (status === 'fast') return STATUS_COLORS.green.hsl;
  if (status === 'moderate') return STATUS_COLORS.amber.hsl;
  return STATUS_COLORS.red.hsl;
}

function getSharpSparklinePath(
  points: ReadonlyArray<number>,
  width: number,
  height: number,
) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M 0,${height / 2} L ${width},${height / 2}`;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const normalizedVal = (val - min) / range;
    const y = height - (normalizedVal * (height * 0.8) + height * 0.1);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${coords.join(' L ')}`;
}

function getSmoothSparklinePath(
  points: ReadonlyArray<number>,
  width: number,
  height: number,
) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M 0,${height / 2} L ${width},${height / 2}`;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const normalizedVal = (val - min) / range;
    const y = height - (normalizedVal * (height * 0.8) + height * 0.1);
    return [x, y] as const;
  });

  const firstPoint = coords[0];
  if (!firstPoint) return '';

  let d = `M ${firstPoint[0].toFixed(1)},${firstPoint[1].toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(i + 2, coords.length - 1)];

    if (!p0 || !p1 || !p2 || !p3) continue;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return d;
}

const SPARKLINE_WIDTH = 48;
const SPARKLINE_HEIGHT = 16;

const COLUMN_WIDTHS = {
  errorRate: 140,
  latency: 140,
  name: 260,
  requests: 140,
} as const;

type RequestBarProps = Readonly<{
  maxRequestCount: number;
  requestCount: number;
}>;

function RequestBar({ maxRequestCount, requestCount }: RequestBarProps) {
  const percentage =
    maxRequestCount > 0 ? (requestCount / maxRequestCount) * 100 : 0;

  return (
    <div
      className="relative flex h-6 max-w-24 items-center rounded-sm bg-muted/80 px-1.5"
      style={{ minWidth: 'fit-content', width: `${percentage}%` }}
    >
      <span className="tabular-nums text-white/80">
        {formatCountString(requestCount)}
      </span>
    </div>
  );
}

type LatencySparklineProps = Readonly<{
  history: ReadonlyArray<{ p75: number }> | undefined;
  p75: number;
}>;

function LatencySparkline({ history, p75 }: LatencySparklineProps) {
  const path = useMemo(() => {
    if (!history || history.length === 0) return '';
    return getSmoothSparklinePath(
      history.map((point) => point.p75),
      SPARKLINE_WIDTH,
      SPARKLINE_HEIGHT,
    );
  }, [history]);

  const color = getLatencyColor(p75);

  if (!path) return <div className="h-4 w-12" />;

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

type ErrorSparklineProps = Readonly<{
  errorRate: number;
  history: ReadonlyArray<{ errorRate: number }> | undefined;
}>;

function ErrorSparkline({ errorRate, history }: ErrorSparklineProps) {
  const path = useMemo(() => {
    if (!history || history.length === 0) return '';
    const errorRates = history.map((point) => point.errorRate);
    const hasVariation = errorRates.some((r) => r !== errorRates[0]);
    if (!hasVariation) return '';
    return getSharpSparklinePath(errorRates, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);
  }, [history]);

  const color = getErrorRateColor(errorRate);

  if (!path) {
    const normalizedRate = Math.min(errorRate, 10) / 10;
    const y =
      SPARKLINE_HEIGHT -
      normalizedRate * SPARKLINE_HEIGHT * 0.8 -
      SPARKLINE_HEIGHT * 0.1;

    return (
      <svg
        aria-hidden="true"
        className="h-4 w-12"
        preserveAspectRatio="none"
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      >
        <line
          stroke={color}
          strokeLinecap="round"
          strokeWidth="1.5"
          x1="0"
          x2={SPARKLINE_WIDTH}
          y1={y}
          y2={y}
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function OperationLatencySparkline({
  series,
}: Readonly<{
  series: ReadonlyArray<{ p75: number }> | undefined;
}>) {
  const path = useMemo(() => {
    if (!series || series.length === 0) return '';
    return getSmoothSparklinePath(
      series.map((s) => s.p75),
      SPARKLINE_WIDTH,
      SPARKLINE_HEIGHT,
    );
  }, [series]);

  if (!path) return <div className="h-4 w-12" />;

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        className="stroke-muted-foreground/50"
        d={path}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function OperationErrorSparkline({
  errorRate,
  series,
}: Readonly<{
  errorRate: number;
  series: ReadonlyArray<{ errorRate: number }> | undefined;
}>) {
  const path = useMemo(() => {
    if (!series || series.length === 0) return '';
    const errorRates = series.map((s) => s.errorRate);
    const hasVariation = errorRates.some((r) => r !== errorRates[0]);
    if (!hasVariation) return '';
    return getSharpSparklinePath(errorRates, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);
  }, [series]);

  if (!path) {
    const normalizedRate = Math.min(errorRate, 10) / 10;
    const y =
      SPARKLINE_HEIGHT -
      normalizedRate * SPARKLINE_HEIGHT * 0.8 -
      SPARKLINE_HEIGHT * 0.1;

    return (
      <svg
        aria-hidden="true"
        className="h-4 w-12"
        preserveAspectRatio="none"
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      >
        <line
          className="stroke-muted-foreground/50"
          strokeLinecap="round"
          strokeWidth="1.5"
          x1="0"
          x2={SPARKLINE_WIDTH}
          y1={y}
          y2={y}
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-12 overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      <path
        className="stroke-muted-foreground/50"
        d={path}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

type DependencyRowProps = Readonly<{
  errorHistory: ReadonlyArray<{ errorRate: number }> | undefined;
  isExpanded: boolean;
  latencyHistory: ReadonlyArray<{ p75: number }> | undefined;
  maxRequestCount: number;
  name: string;
  onToggle: () => void;
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

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
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
          <LatencySparkline history={latencyHistory} p75={stats.p75} />
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
          <ErrorSparkline errorRate={stats.errorRate} history={errorHistory} />
        </div>
      </TableCell>
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

  const isPath = operation.operation.startsWith('/');

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
          <OperationLatencySparkline series={series} />
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
          <OperationErrorSparkline
            errorRate={operation.errorRate}
            series={series}
          />
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedKeys.map((key) => {
            const stats = dependencies[key];
            if (!stats) return null;

            const latencyHistory =
              stats.history && stats.history.length > 1
                ? stats.history.map((point) => ({ p75: point.value }))
                : undefined;

            const errorHistory =
              stats.history && stats.history.length > 1
                ? stats.history.map((point) => ({ errorRate: point.value }))
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
                  onToggle={() => toggle(key)}
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
