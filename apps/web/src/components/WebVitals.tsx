'use client';

import { WEB_VITALS_SAMPLE_RATE } from '@tvseri.es/constants';
import type { WebVitalRecord } from '@tvseri.es/schemas';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { Metric } from 'web-vitals';

import { toRouteTemplate } from '@/lib/routeTemplate';

const METRICS_ENDPOINT = '/api/metrics/web-vitals';
const METRIC_COUNT = 5; // CLS, FCP, INP, LCP, TTFB

type QueuedRecord = Omit<WebVitalRecord, 'country'>;

function getDeviceType(): string {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

let metricsQueue: QueuedRecord[] = [];
let isInitialized = false;

/** Current route info, updated on navigation. */
let currentRoute: string | null = null;
let currentPath: string | null = null;

/** Send metrics using fetch with keepalive (preferred) or sendBeacon fallback. */
function sendBeacon(metrics: QueuedRecord[]): void {
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

function flush(): void {
  if (metricsQueue.length === 0) return;

  const metrics = [...metricsQueue];
  metricsQueue = [];

  sendBeacon(metrics);
}

/** Queue a metric. Flushes when all metrics are collected. */
function queueMetric(metric: Metric): void {
  metricsQueue.push({
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
    name: metric.name,
    navigationType: metric.navigationType,
    path: currentPath ?? '/',
    rating: metric.rating,
    route: currentRoute ?? currentPath ?? '/',
    timestamp: new Date().toISOString(),
    type: 'web-vital',
    value: metric.value,
  });

  if (metricsQueue.length >= METRIC_COUNT) {
    flush();
  }
}

function initWebVitals(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Sampled per page load: unsampled loads don't even load web-vitals, so they
  // send nothing (no Vercel function run). The aggregation scales counts up.
  if (Math.random() >= WEB_VITALS_SAMPLE_RATE) return;

  import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    onCLS(queueMetric);
    onFCP(queueMetric);
    onINP(queueMetric);
    onLCP(queueMetric);
    onTTFB(queueMetric);

    addEventListener('visibilitychange', flush);
    addEventListener('pagehide', flush);
  });
}

/**
 * Web Vitals collection (LCP, INP, CLS, FCP, TTFB) for a sample of page
 * loads. Metrics are batched and flushed when all 5 are collected, when the
 * page is hidden, or on pagehide. Each record carries the path and its route
 * template (`/[id]/[[...slug]]`), updated on client-side navigation. Render
 * once, in the root layout.
 */
export default function WebVitals() {
  const pathname = usePathname();

  // Syncs module state with the router and starts collection once: there is
  // no render output, so an effect is the only place for it.
  useEffect(() => {
    currentPath = pathname;
    currentRoute = toRouteTemplate(pathname);
    initWebVitals();
  }, [pathname]);

  return null;
}
