import { cva } from 'class-variance-authority';

const gridStyles = cva([
  'grid',
  'grid-cols-2',
  'gap-6',
  'md:grid-cols-4',
  'xl:grid-cols-6',
  '[&>*]:!h-full',
  '[&>*]:!w-full',
]);

/**
 * `sizes` for an item stretched to one column of this grid: the container's
 * width (breakpoint minus 2rem padding per side) minus the gaps, per column
 * count. Overstating it makes the browser pick a bigger file than drawn.
 */
export const gridItemSizes =
  '(min-width: 1536px) 225px, (min-width: 1280px) 183px, (min-width: 1024px) 222px, (min-width: 768px) 158px, calc(50vw - 44px)';

/** How many items fill the first row at the widest breakpoint */
export const GRID_FIRST_ROW = 6;

export default function Grid({
  className,
  children,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={gridStyles({ className })}>{children}</div>;
}
