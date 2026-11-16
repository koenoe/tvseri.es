import { type ReactNode, Suspense } from 'react';

/**
 * A streamed settings section: its placeholder and its content each sit in a
 * plain block (`data-placeholder` / `data-slot`, same name) that adds no box
 * of its own; the parity spec measures them against each other.
 */
export default function SettingsHole({
  children,
  className,
  fallback,
  name,
}: Readonly<{
  children: ReactNode;
  /** The content's own layout, when it is several blocks in a stack */
  className?: string;
  fallback: ReactNode;
  name: string;
}>) {
  return (
    <Suspense fallback={<div data-placeholder={name}>{fallback}</div>}>
      <div className={className} data-slot={name}>
        {children}
      </div>
    </Suspense>
  );
}
