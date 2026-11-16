import type { ReactNode } from 'react';

/**
 * A hub section's title line without a row under it (title-2, then its
 * actions at the end).
 */
export default function SectionHeader({
  actions,
  id,
  title,
}: Readonly<{ actions?: ReactNode; id: string; title: string }>) {
  return (
    <div className="flex min-h-11 items-center gap-3.5">
      <h2 className="min-w-0 truncate text-title-2 text-white" id={id}>
        {title}
      </h2>
      {actions ? (
        <span className="ml-auto flex shrink-0 items-center gap-3.5">
          {actions}
        </span>
      ) : null}
    </div>
  );
}
