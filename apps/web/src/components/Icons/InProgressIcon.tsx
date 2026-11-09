import { strokeProps } from './strokeProps';

export function InProgressIcon({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M12 3a9 9 0 1 1-9 9" />
    </svg>
  );
}
