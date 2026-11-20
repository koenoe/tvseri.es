import Link from 'next/link';
import type { ReactNode } from 'react';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import IntentLink from '@/components/ui/link/IntentLink';
import cn from '@/lib/cn';

import { HEAD_LINK } from '../../../_lib/headLink';

/**
 * The link at the end of a block header: "All in progress ›" in a lane,
 * "42 ›" / "Stats ›" by a section rule. Both draw the chevron at 13px.
 */
export default function HeadLink({
  children,
  className,
  href,
  label,
  motionTypes,
  prefetch,
}: Readonly<{
  children: ReactNode;
  className?: string;
  href: string;
  /** a fuller name than the visible text ("Watchlist, 55 series"), starting with it */
  label?: string;
  /** With `prefetch="intent"`: the view transition types it navigates with */
  motionTypes?: string[];
  /** `intent`: the page's own content is fetched as the link is about to be followed (`IntentLink`) */
  prefetch?: 'intent';
}>) {
  const classes = cn(HEAD_LINK, 'shrink-0', className);
  const content = (
    <>
      {children}
      <Icon glyph={chevronRightGlyph} size={13} />
    </>
  );
  return prefetch === 'intent' ? (
    <IntentLink
      aria-label={label}
      className={classes}
      href={href}
      motionTypes={motionTypes}
    >
      {content}
    </IntentLink>
  ) : (
    <Link aria-label={label} className={classes} href={href}>
      {content}
    </Link>
  );
}
