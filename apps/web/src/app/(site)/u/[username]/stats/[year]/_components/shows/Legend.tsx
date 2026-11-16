import type { ReactNode } from 'react';

function Item({
  children,
  desktopOnly,
  mark,
}: Readonly<{ children: ReactNode; desktopOnly?: boolean; mark: ReactNode }>) {
  return (
    <span
      className={
        desktopOnly
          ? 'hidden items-center gap-2 md:inline-flex'
          : 'inline-flex items-center gap-2'
      }
    >
      {mark}
      {children}
    </span>
  );
}

/**
 * What the marks mean (`.st-tlleg`). The phone board keeps the last two,
 * "Finished" and "Still watching", and puts the "All 71" link on the same
 * line (`children`).
 */
export default function Legend({
  children,
}: Readonly<{ children?: ReactNode }>) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-caption text-white/60 md:flex-nowrap md:gap-5 md:px-2.5 md:pt-3.5 md:pb-0.5">
      <Item desktopOnly mark={<i className="h-1 w-4 rounded-2 bg-white" />}>
        Watched that week
      </Item>
      <Item desktopOnly mark={<i className="h-1 w-4 rounded-2 bg-white/12" />}>
        Between first and last
      </Item>
      <Item mark={<i className="h-3 w-0.5 rounded-[1px] bg-white/70" />}>
        <span className="md:hidden">Finished</span>
        <span className="hidden md:inline">Finished or caught up</span>
      </Item>
      <Item mark={<i className="size-2 rounded-full bg-cyan" />}>
        Still watching
      </Item>
      {children}
    </div>
  );
}
