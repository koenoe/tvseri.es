import { strokeProps } from './strokeProps';

export function CircleCheckIcon({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
