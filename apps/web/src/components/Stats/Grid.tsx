import type { ReactNode } from 'react';

/**
 * `sizes` for an item stretched to one column of this grid: the container's
 * width (breakpoint minus 2rem padding per side) minus the gaps, per column
 * count
 */
export const statsGridItemSizes =
  '(min-width: 1536px) 126px, (min-width: 1280px) 131px, (min-width: 1024px) 106px, (min-width: 768px) 104px, calc(25vw - 28px)';

export default function Grid({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:gap-6 2xl:grid-cols-10 [&>*]:!h-full [&>*]:!w-full">
      {children}
    </div>
  );
}
