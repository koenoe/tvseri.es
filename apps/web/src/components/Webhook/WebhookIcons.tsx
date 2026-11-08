// Stroke icons for the webhook card (24×24 grid, sized by the caller)

const strokeProps = {
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 2,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;

export function PlusIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function EyeIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2" />
      <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function RegenerateIcon({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function CopyIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <rect height="4" rx="1" width="8" x="8" y="3" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

export function CheckIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} {...strokeProps}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
