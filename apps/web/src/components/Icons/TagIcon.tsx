import { strokeProps } from './strokeProps';

export function TagIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <path d="M7 7h.01" />
    </svg>
  );
}
