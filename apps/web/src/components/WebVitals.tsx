'use client';

import type { NavigationType, WebVitalRecord } from '@tvseri.es/schemas';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Metric } from 'web-vitals';

const METRICS_ENDPOINT = '/api/metrics/web-vitals';
const METRIC_COUNT = 5; // CLS, FCP, INP, LCP, TTFB

/**
 * Convert a path parameter value to a RegExp for matching in the pathname.
 * Escapes special regex characters and matches the value as a path segment.
 */
function turnValueToRegExp(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`/${escaped}(?=[/?#]|$)`);
}

/**
 * Compute the route pattern from pathname and path params.
 * Replaces param values with bracketed param names.
 *
 * Example:
 *   pathname: '/tv/12345/breaking-bad'
 *   pathParams: { id: '12345', slug: ['breaking-bad'] }
 *   returns: '/tv/[id]/[...slug]'
 *
 */
function computeRoute(
  pathname: string | null,
  pathParams: Record<string, string | string[]> | null,
): string | null {
  if (!pathname || !pathParams) {
    return pathname;
  }

  let result = pathname;
  try {
    const entries = Object.entries(pathParams);
    // simple keys must be handled first
    for (const [key, value] of entries) {
      if (!Array.isArray(value)) {
        const matcher = turnValueToRegExp(value);
        if (matcher.test(result)) {
          result = result.replace(matcher, `/[${key}]`);
        }
      }
    }
    // array values next
    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        const matcher = turnValueToRegExp(value.join('/'));
        if (matcher.test(result)) {
          result = result.replace(matcher, `/[...${key}]`);
        }
      }
    }
    return result;
  } catch {
    return pathname;
  }
}

// ---------------------------------------------------------------------------
// Device detection
// ---------------------------------------------------------------------------

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// ---------------------------------------------------------------------------
// Metrics queue and sending
// ---------------------------------------------------------------------------

let metricsQueue: Array<Omit<WebVitalRecord, 'country'>> = [];
let isInitialized = false;

/**
 * Current route info, updated on navigation.
 */
let currentRoute: string | null = null;
let currentPath: string | null = null;

/**
 * Send metrics using fetch with keepalive (preferred) or sendBeacon fallback.
 */
function sendBeacon(metrics: Array<Omit<WebVitalRecord, 'country'>>): void {
  if (metrics.length === 0) return;

  const body = JSON.stringify(metrics);

  try {
    if ('keepalive' in Request.prototype) {
      fetch(METRICS_ENDPOINT, {
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        method: 'POST',
      }).catch(() => {
        // Silently fail
      });
    } else if (navigator.sendBeacon) {
      navigator.sendBeacon(METRICS_ENDPOINT, body);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Flush all queued metrics to the server.
 */
function flush(): void {
  if (metricsQueue.length === 0) return;

  const metrics = [...metricsQueue];
  metricsQueue = [];

  sendBeacon(metrics);
}

/**
 * Queue a metric. Flushes when all metrics are collected.
 */
function queueMetric(metric: Metric): void {
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
    path: currentPath ?? '/',
    rating: metric.rating as WebVitalRecord['rating'],
    route: currentRoute ?? currentPath ?? '/',
    timestamp: new Date().toISOString(),
    type: 'web-vital',
    value: metric.value,
  };

  metricsQueue.push(record);

  // Flush when all metrics are collected
  if (metricsQueue.length >= METRIC_COUNT) {
    flush();
  }
}

/**
 * Initialize web-vitals collection.
 */
function initWebVitals(): void {
  if (isInitialized) return;
  isInitialized = true;

  import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    // Register metric handlers
    onCLS(queueMetric);
    onFCP(queueMetric);
    onINP(queueMetric);
    onLCP(queueMetric);
    onTTFB(queueMetric);

    // Register flush handlers (after web-vitals setup)
    addEventListener('visibilitychange', flush);
    addEventListener('pagehide', flush);
  });
}

/**
 * Update the current route. Called when pathname/params change.
 */
function setRoute(
  pathname: string,
  params: Record<string, string | string[]>,
): void {
  currentPath = pathname;
  currentRoute = computeRoute(pathname, params);
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/**
 * Web Vitals collection component.
 *
 * Measures: LCP, INP, CLS, FCP, TTFB
 *
 * Metrics are batched and flushed when:
 * - All 5 metrics are collected, OR
 * - Page visibility changes to hidden, OR
 * - Page is being unloaded (pagehide)
 *
 * Route is updated on client-side navigation
 */
const WebVitals = () => {
  const pathname = usePathname();
  const params = useParams();
  const isFirstRender = useRef(true);

  // Update route when pathname/params change
  useEffect(() => {
    setRoute(pathname, params as Record<string, string | string[]>);

    // Initialize on first render only
    if (isFirstRender.current) {
      isFirstRender.current = false;
      initWebVitals();
    }
  }, [pathname, params]);

  return null;
};

WebVitals.displayName = 'WebVitals';

export default WebVitals;
