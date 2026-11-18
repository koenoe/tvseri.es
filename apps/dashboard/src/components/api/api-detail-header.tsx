import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { DateRangeSelect } from '@/components/date-range-select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/** Header of an API detail page: a breadcrumb back to API, then the date range. */
export function ApiDetailHeader({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex w-full items-center justify-between">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/api">API</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>{children}</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <DateRangeSelect />
    </div>
  );
}

ApiDetailHeader.displayName = 'ApiDetailHeader';
