import Link from 'next/link';
import type { ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';

/**
 * The sidebar identity's shared measures: the profile's own block, the
 * Stats sidebar's and the Settings preview's
 */

/** The handle, the meta lines, the services and the action, 22px apart */
export const IDENTITY_BLOCK = 'flex flex-col gap-[22px]';

/** The meta lines as a group: 14px, 12px apart */
const IDENTITY_LINES =
  'flex flex-col gap-3 text-[14px] leading-[normal] text-white/70';

/** One meta line: a 15px icon, then its text on one line */
export const IDENTITY_LINE = 'flex items-center gap-2.5 whitespace-nowrap';

const IDENTITY_ICON = 'size-[15px]';

/** The meta lines under the handle ("Member since…", the counts, the circle) */
export function IdentityLines({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={IDENTITY_LINES}>{children}</div>;
}

type LineProps = Readonly<{
  children: ReactNode;
  glyph: Glyph | ToggleGlyph;
}>;

/** One meta line: its 15px icon, then the words the place passes */
export function IdentityLine({ children, glyph }: LineProps) {
  return (
    <span className={IDENTITY_LINE}>
      <Icon className={IDENTITY_ICON} glyph={glyph} size={13} />
      {children}
    </span>
  );
}

const LINK_LINE = `${IDENTITY_LINE} hover:text-white`;

/** A meta line that links (the followers line opens the circle) */
export function IdentityLinkLine({
  children,
  glyph,
  href,
}: LineProps & Readonly<{ href: string }>) {
  return (
    <Link className={LINK_LINE} href={href}>
      <Icon className={IDENTITY_ICON} glyph={glyph} size={13} />
      {children}
    </Link>
  );
}
