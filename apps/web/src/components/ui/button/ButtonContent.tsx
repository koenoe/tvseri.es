import type { ReactNode } from 'react';

import { pendingGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph, IconSize, ToggleGlyph } from '@/components/ui/icon/types';

/**
 * The inside of every pill: leading icon, label, trailing icon. A string
 * label truncates (the pill is never wider than its container). A toggle glyph
 * (eye, bookmark…) shows its filled drawing while `active`; `pending` swaps
 * the leading icon for the spinning pending ring.
 */
export default function ButtonContent({
  active,
  children,
  icon,
  iconSize,
  pending,
  trailingIcon,
}: Readonly<{
  active?: boolean;
  children: ReactNode;
  icon?: Glyph | ToggleGlyph;
  iconSize: IconSize;
  pending?: boolean;
  trailingIcon?: Glyph;
}>) {
  return (
    <>
      <LeadingIcon
        active={active}
        icon={icon}
        pending={pending}
        size={iconSize}
      />
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

function LeadingIcon({
  active,
  icon,
  pending,
  size,
}: Readonly<{
  active?: boolean;
  icon?: Glyph | ToggleGlyph;
  pending?: boolean;
  size: IconSize;
}>) {
  if (pending) {
    return <Icon className="animate-spin" glyph={pendingGlyph} size={size} />;
  }
  if (!icon) {
    return null;
  }
  if (icon.filled) {
    return <Icon active={active} glyph={icon} size={size} />;
  }
  return <Icon glyph={icon} size={size} />;
}
