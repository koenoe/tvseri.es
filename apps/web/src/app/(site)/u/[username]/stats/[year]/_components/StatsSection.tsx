import { type ReactNode, Suspense } from 'react';

import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';

/**
 * One block of the page: its own Suspense (an exact-size skeleton while an
 * entry regenerates) and error boundary, so a failing block never takes the
 * page down.
 */
export default function StatsSection({
  children,
  fallback,
  id,
  title,
}: Readonly<{
  children: ReactNode;
  fallback: ReactNode;
  id: string;
  title: string;
}>) {
  return (
    <RowErrorBoundary id={id} title={title}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </RowErrorBoundary>
  );
}
