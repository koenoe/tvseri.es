import { strokeProps } from './strokeProps';

export function ImportIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
