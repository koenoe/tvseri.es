import type { DependencyStats } from '@tvseri.es/schemas';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';

import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { sortDependencyKeys } from '@/lib/api-metrics';
import { COLUMN_WIDTHS, DependencyRow, OperationRow } from './dependency-rows';
import { TableFrame } from './table/table-frame';

type DependenciesSectionProps = Readonly<{
  dependencies: Record<string, DependencyStats> | undefined;
}>;

function DependenciesSectionComponent({
  dependencies,
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
    if (!dependencies) return 1;
    return Math.max(...Object.values(dependencies).map((d) => d.count), 1);
  }, [dependencies]);

  if (!dependencies || sortedKeys.length === 0) {
    return null;
  }

  return (
    <TableFrame>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-3" style={{ width: COLUMN_WIDTHS.name }}>
            <span className="text-muted-foreground">Dependency</span>
          </TableHead>
          <TableHead className="px-3" style={{ width: COLUMN_WIDTHS.requests }}>
            <span className="text-muted-foreground">Requests</span>
          </TableHead>
          <TableHead className="px-3" style={{ width: COLUMN_WIDTHS.latency }}>
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

          const history =
            stats.history && stats.history.length > 1
              ? stats.history.map((point) => point.value)
              : undefined;

          const isExpanded = expanded.has(key);

          return (
            <Fragment key={key}>
              <DependencyRow
                history={history}
                isExpanded={isExpanded}
                maxRequestCount={maxRequestCount}
                name={key}
                onToggle={toggle}
                stats={stats}
              />
              {isExpanded &&
                stats.topOperations?.map((op) => (
                  <OperationRow
                    key={op.operation}
                    maxRequestCount={maxRequestCount}
                    operation={op}
                  />
                ))}
            </Fragment>
          );
        })}
      </TableBody>
    </TableFrame>
  );
}

DependenciesSectionComponent.displayName = 'DependenciesSection';

export const DependenciesSection = memo(DependenciesSectionComponent);
