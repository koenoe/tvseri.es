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

/** `sizes` for an item stretched to one column of this grid */
export const gridItemSizes =
  '(min-width: 1280px) 17vw, (min-width: 768px) 25vw, 50vw';

export default function Grid({
  className,
  children,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={gridStyles({ className })}>{children}</div>;
}
