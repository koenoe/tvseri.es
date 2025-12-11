import { AsyncLocalStorage } from 'node:async_hooks';

import type { DependencyMetric } from '@tvseri.es/schemas';

/**
 * Metrics store for a single request.
 * Collected via AsyncLocalStorage to track dependencies across async calls.
 */
export type MetricsStore = {
  dependencies: DependencyMetric[];
};

/**
 * AsyncLocalStorage instance for metrics collection.
 * Allows tracking dependencies across the entire request lifecycle.
 */
export const metricsContext = new AsyncLocalStorage<MetricsStore>();

/**
 * Get the current metrics store, or undefined if not in a metrics context.
 */
export const getMetricsStore = (): MetricsStore | undefined => {
  return metricsContext.getStore();
};

/**
 * Add a dependency metric to the current request's store.
 */
export const addDependencyMetric = (metric: DependencyMetric): void => {
  const store = metricsContext.getStore();
  store?.dependencies.push(metric);
};

/**
 * Run a function within a metrics context.
 */
export const runWithMetrics = <T>(fn: () => T): T => {
  const store: MetricsStore = { dependencies: [] };
  return metricsContext.run(store, fn);
};
