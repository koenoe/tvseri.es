'use client';

import type { ErrorInfo } from 'next/error';

import AppErrorView from '@/components/ui/error/AppErrorView';

/**
 * The error boundary for every page: the 500, data down or off
 * air, over the still with the real header and no footer. At the root so it replaces the `(site)` layout; the root layout
 * itself is `global-error.tsx`.
 */
export default function ErrorPage({ error, retry }: ErrorInfo) {
  return <AppErrorView error={error} retry={retry} />;
}
