import type { ReactNode } from 'react';

export type TabItem = Readonly<{
  href: string;
  /** Small line icon before the label (size-4) */
  icon?: ReactNode;
  label: string;
}>;
