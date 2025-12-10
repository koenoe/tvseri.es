import { cva } from 'class-variance-authority';

export const gridStyles = cva([
  'grid',
  'grid-cols-2',
  'gap-6',
  'md:grid-cols-4',
  'xl:grid-cols-6',
  '[&>*]:!h-full',
  '[&>*]:!w-full',
]);

export default function Grid({
  className,
  children,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={gridStyles({ className })}>{children}</div>;
}
