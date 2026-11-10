import { strokeProps } from './strokeProps';

export function LayersIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}
