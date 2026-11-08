import type { ReactNode } from 'react';

/** `sizes` for an item stretched to one column of this grid */
export const statsGridItemSizes =
  '(min-width: 1536px) 10vw, (min-width: 1024px) 13vw, (min-width: 768px) 17vw, 25vw';

export default function Grid({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:gap-6 2xl:grid-cols-10 [&>*]:!h-full [&>*]:!w-full">
      {children}
    </div>
  );
}
