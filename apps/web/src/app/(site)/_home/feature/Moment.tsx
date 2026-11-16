import type { ReactNode } from 'react';

/**
 * A moment's box between the rows. No title row above
 * the block: its label (`MomentLabel`) heads it from inside. The
 * placeholder is this same frame, so they share their box.
 */
export function MomentFrame({
  children,
  name,
  placeholder,
}: Readonly<{
  children: ReactNode;
  /** the parity checks' name: `data-slot`, or `data-placeholder` for the placeholder */
  name?: string;
  placeholder?: boolean;
}>) {
  return (
    <div
      aria-hidden={placeholder || undefined}
      className="flex flex-col gap-6"
      data-placeholder={placeholder ? name : undefined}
      data-slot={placeholder ? undefined : name}
    >
      {children}
    </div>
  );
}
