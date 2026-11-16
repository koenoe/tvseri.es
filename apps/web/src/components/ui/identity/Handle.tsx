import Link from 'next/link';
import type { CSSProperties } from 'react';

import { handleFontSize } from './handleFit';

type Size = 'compact' | 'full';

type SizeStyle = Readonly<{
  /** `handleFontSize`'s range and the @'s size in em */
  fit: Parameters<typeof handleFontSize>[1];
  /** the @ */
  mark: string;
  /** the handle's line */
  line: string;
}>;

const SIZES: Readonly<Record<Size, SizeStyle>> = {
  /** 16 to 32px, the @ at 0.75em; the line stays 40px */
  compact: {
    fit: { at: 0.75, max: 32, min: 16 },
    line: 'truncate font-display leading-10 font-extrabold tracking-[-0.03em]',
    // contrast-exempt: the @ mark
    mark: 'mr-0.5 text-[0.75em] leading-none tracking-normal text-white/40',
  },
  /** 20 to 48px; the padding gives the descenders room inside the clip */
  full: {
    fit: { max: 48, min: 20 },
    line: '-my-[0.1em] overflow-hidden py-[0.1em] font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ellipsis whitespace-nowrap',
    // contrast-exempt: the @ mark
    mark: 'mr-0.5 align-[0.214em] text-[0.6em] font-semibold tracking-normal text-white/40',
  },
};

/**
 * "@alex": Jakarta 800 on one line (typography spec, Profile block), the @
 * smaller and dimmer. The size is fitted to the column (`@container` on it:
 * the 300px sidebar, the page width on a phone) from the handle's measured
 * width, so every generated handle fits; a chosen handle still too long at
 * the minimum ends with an ellipsis, the full name on hover. `compact` is
 * the phone sub-pages' identity beside its button; the full identity's
 * handle is display:none whenever it shows, so there is one h1 at a time.
 */
export default function Handle({
  as: Tag = 'h1',
  href,
  size = 'full',
  username,
}: Readonly<{
  as?: 'h1' | 'h2' | 'p';
  /** makes the handle a link (Stats: the way to the profile) */
  href?: string;
  size?: Size;
  username: string;
}>) {
  const { fit, line, mark: markClass } = SIZES[size];
  const style: CSSProperties = { fontSize: handleFontSize(username, fit) };
  const mark = (
    <>
      <span className={markClass}>@</span>
      {username}
    </>
  );
  const content = href ? <Link href={href}>{mark}</Link> : mark;
  return (
    <Tag className={line} style={style} title={`@${username}`}>
      {content}
    </Tag>
  );
}
