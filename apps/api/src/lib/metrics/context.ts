import { AsyncLocalStorage } from 'node:async_hooks';

import type { DependencyMetric } from '@tvseri.es/schemas';

/** One request's dependency calls, collected across its async calls */
export type MetricsStore = {
  dependencies: DependencyMetric[];
};

const metricsContext = new AsyncLocalStorage<MetricsStore>();

/** Undefined outside `runWithMetrics` */
export const getMetricsStore = (): MetricsStore | undefined => {
  return metricsContext.getStore();
};

/** Dropped outside `runWithMetrics` */
export const addDependencyMetric = (metric: DependencyMetric): void => {
  const store = metricsContext.getStore();
  store?.dependencies.push(metric);
};

export const runWithMetrics = <T>(fn: () => T): T => {
  const store: MetricsStore = { dependencies: [] };
  return metricsContext.run(store, fn);
};
