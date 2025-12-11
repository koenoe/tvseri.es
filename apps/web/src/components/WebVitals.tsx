'use client';

import type { NavigationType, WebVitalRecord } from '@tvseri.es/schemas';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Metric } from 'web-vitals';

const METRICS_ENDPOINT = '/api/metrics/web-vitals';

/**
 * Get device type from viewport width.
 */
const getDeviceType = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Derive route pattern from pathname and params.
 * Replaces param values with bracketed param names.
 *
 * Example:
 *   pathname: '/tv/12345/breaking-bad'
 *   params: { id: '12345', slug: ['breaking-bad'] }
 *   returns: '/tv/[id]/[...slug]'
 */
const deriveRoute = (
  pathname: string,
  params: Record<string, string | string[]>,
): string => {
  if (!params || Object.keys(params).length === 0) {
    return pathname;
  }

  let route = pathname;

  // Sort params by value length (longest first) to avoid partial replacements
  // e.g., 'fr' could match before 'france' if not sorted
  const sortedParams = Object.entries(params).sort(([, a], [, b]) => {
    const aLen = Array.isArray(a) ? a.join('/').length : a.length;
    const bLen = Array.isArray(b) ? b.join('/').length : b.length;
    return bLen - aLen;
  });

  for (const [key, value] of sortedParams) {
    if (Array.isArray(value)) {
      // Catch-all params like [...slug] or [[...slug]]
      const joinedValue = value.join('/');
      if (joinedValue && route.includes(joinedValue)) {
        route = route.replace(joinedValue, `[...${key}]`);
      }
    } else if (value && route.includes(`/${value}`)) {
      // Regular params like [id]
      // Use word boundaries to avoid partial matches
      route = route.replace(`/${value}`, `/[${key}]`);
    }
  }

  return route;
};

/**
 * Queue for batching metrics before sending.
 * Uses Map with metric.id as key for deduplication (safety for bfcache restores).
 */
const metricsQueue = new Map<string, Omit<WebVitalRecord, 'country'>>();

/**
 * Flush queued metrics to the server.
 * Uses sendBeacon for reliable delivery during page unload.
 */
const flushQueue = (): void => {
  if (metricsQueue.size === 0) return;

  const metrics = Array.from(metricsQueue.values());
  metricsQueue.clear();

  const body = JSON.stringify(metrics);

  // sendBeacon is preferred - works during page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon(METRICS_ENDPOINT, body);
  } else {
    // Fallback for older browsers
    fetch(METRICS_ENDPOINT, {
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    }).catch(() => {
      // Silently fail - metrics shouldn't break the app
    });
  }
};

/**
 * Add a metric to the queue (overwrites previous value for same id).
 */
const queueMetric = (
  metric: Metric,
  pathname: string,
  params: Record<string, string | string[]>,
): void => {
  const route = deriveRoute(pathname, params);

  const record: Omit<WebVitalRecord, 'country'> = {
    client: {
      platform: 'web',
      userAgent: navigator.userAgent,
      version: null,
    },
    delta: metric.delta,
    device: {
      type: getDeviceType(),
    },
    id: metric.id,
    name: metric.name as WebVitalRecord['name'],
    navigationType: (metric.navigationType ?? 'navigate') as NavigationType,
    path: pathname,
    rating: metric.rating as WebVitalRecord['rating'],
    route,
    timestamp: new Date().toISOString(),
    type: 'web-vital',
    value: metric.value,
  };

  // Use metric.id as key for deduplication safety
  metricsQueue.set(metric.id, record);
};

/**
 * Component that collects and reports Core Web Vitals metrics.
 *
 * Measures:
 * - LCP (Largest Contentful Paint) - loading performance
 * - INP (Interaction to Next Paint) - interactivity
 * - CLS (Cumulative Layout Shift) - visual stability
 * - FCP (First Contentful Paint) - initial render
 * - TTFB (Time to First Byte) - server response time
 *
 * Uses a batched queue approach:
 * - Metrics are queued as they occur
 * - Queue is flushed when page is backgrounded/unloaded
 * - Deduplicates by metric.id (important for CLS which updates over time)
 *
 * Should be placed in the root layout to track metrics on all pages.
 */
const WebVitals = () => {
  const pathname = usePathname();
  const params = useParams();

  // Store the current pathname and params in a ref so we can access them
  // in the web-vitals callbacks without causing re-subscriptions
  const routeInfoRef = useRef({ params, pathname });

  // Update ref when pathname or params change
  useEffect(() => {
    routeInfoRef.current = { params, pathname };
  }, [pathname, params]);

  useEffect(() => {
    // Set up visibility change listener to flush queue when page is hidden
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        flushQueue();
      }
    };

    // Also flush on pagehide (backup for some mobile browsers)
    const handlePageHide = (): void => {
      flushQueue();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // Dynamic import to avoid SSR issues and reduce initial bundle
    import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      // Handler that queues metrics with current route info
      const handleMetric = (metric: Metric): void => {
        const { params: currentParams, pathname: currentPathname } =
          routeInfoRef.current;
        queueMetric(
          metric,
          currentPathname,
          currentParams as Record<string, string | string[]>,
        );
      };

      // Default behavior (no reportAllChanges) means metrics are reported
      // at their final value when the page is hidden/unloaded.
      // This is the recommended approach for production analytics.
      onCLS(handleMetric);
      onFCP(handleMetric);
      onINP(handleMetric);
      onLCP(handleMetric);
      onTTFB(handleMetric);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      // Flush any remaining metrics on unmount
      flushQueue();
    };
  }, []);

  return null;
};

WebVitals.displayName = 'WebVitals';

export default WebVitals;
