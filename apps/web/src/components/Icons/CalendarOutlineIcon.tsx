import { strokeProps } from './strokeProps';

export function CalendarOutlineIcon({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <rect height="18" rx="2" width="18" x="3" y="4" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
