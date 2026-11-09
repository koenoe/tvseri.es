import { strokeProps } from './strokeProps';

export function BarChartIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}
