import { strokeProps } from './strokeProps';

export function ClockOutlineIcon({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
