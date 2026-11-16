import type { ReactNode } from 'react';

/**
 * A row of small keys in equal columns (three of 101px or two of 156px in the
 * 336px Remote). ↑ ↓ move between rows, keeping the column.
 */
export default function KeyRow({
  children,
  describedBy,
  label,
}: Readonly<{ children: ReactNode; describedBy?: string; label?: string }>) {
  return (
    <div
      aria-describedby={describedBy}
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-2"
      data-remote-row=""
      role="group"
    >
      {children}
    </div>
  );
}
