import { strokeProps } from './strokeProps';

export function TvIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <rect height="15" rx="2" width="20" x="2" y="7" />
      <path d="m17 2-5 5-5-5" />
    </svg>
  );
}
