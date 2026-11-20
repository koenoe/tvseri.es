import type { ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import type { Glyph, IconSize, ToggleGlyph } from '@/components/ui/icon/types';

/**
 * The inside of every pill: leading icon, label, trailing icon. A string
 * label truncates (the pill is never wider than its container). The icons
 * are plain server-drawn `Icon`s; a pill whose icon changes (`Button`'s
 * `pressed` or `pending`) draws its own leading icon (`leading`). It doesn't
 * import that swap itself, so a static pill (`ButtonLink`, a card's
 * "Open" label) never brings Motion's swap to a page that only shows it.
 */
export default function ButtonContent({
  children,
  icon,
  iconSize,
  leading,
  trailingIcon,
}: Readonly<{
  children: ReactNode;
  icon?: Glyph | ToggleGlyph;
  iconSize: IconSize;
  /** A leading icon the pill draws itself, in place of `icon` */
  leading?: ReactNode;
  trailingIcon?: Glyph;
}>) {
  const leadingIcon =
    leading ?? (icon ? <Icon glyph={icon} size={iconSize} /> : null);
  return (
    <>
      {leadingIcon}
      {/* a text label ends with an ellipsis where the pill meets its
          container's edge ("Open Law & Order: Special Victims Unit" in a
          narrow column), never past it */}
      {typeof children === 'string' ? (
        <span className="truncate">{children}</span>
      ) : (
        children
      )}
      {trailingIcon ? <Icon glyph={trailingIcon} size={iconSize} /> : null}
    </>
  );
}
