import type { ReactNode } from 'react';

/**
 * The bar behind the tabs. Desktop: 56px, 10px padding, 12px corners,
 * the pills in a row. Phone: 4px padding, 14px corners,
 * 2px between five equal columns, 58px tall with or without the tabs (the
 * skeleton is the same box), never scrolling.
 */
export default function TabsFrame({
  children,
}: Readonly<{ children?: ReactNode }>) {
  return (
    <nav
      aria-label="Profile"
      className="flex h-14 items-center bg-black/22 max-md:h-[58px] max-md:rounded-14 max-md:p-1 md:rounded-12 md:p-2.5"
    >
      <div className="flex h-full min-w-0 flex-1 items-center max-md:gap-0.5 md:gap-1 md:overflow-x-auto md:[scrollbar-width:none]">
        {children}
      </div>
    </nav>
  );
}
