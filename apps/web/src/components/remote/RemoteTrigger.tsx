import type { ComponentProps, CSSProperties, ReactNode } from 'react';

import type { CircleButtonSize } from '@/components/ui/button/buttonStyles';
import { moreGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { IconSize } from '@/components/ui/icon/types';

import { remoteTriggerStyles } from './styles';

/** The keys that open the Remote from its ⋯ (on the big key) */
export const OPEN_KEYS: ReadonlySet<string> = new Set([
  'Enter',
  ' ',
  'ArrowDown',
]);

/** The Remote's name and its ⋯'s: “Actions for The Bear”, “More actions for The Bear” */
export const remoteLabels = (seriesName: string) =>
  ({
    menu: `Actions for ${seriesName}`,
    trigger: `More actions for ${seriesName}`,
  }) as const;

type Props = Omit<
  ComponentProps<'button'>,
  'aria-haspopup' | 'aria-label' | 'children' | 'className' | 'title' | 'type'
> &
  Readonly<{
    /** What follows the ⋯ inside its ink: the Remote's popover or sheet */
    after?: ReactNode;
    className?: string;
    iconSize: IconSize;
    /** The ink a tile passes (`--remote-ink`); the page colour otherwise */
    ink?: string;
    /** The ⋯'s name (`remoteLabels(…).trigger`) */
    label: string;
    size: CircleButtonSize;
  }>;

/**
 * The Remote's ⋯: a circle button that opens a menu, inside the ink's scope.
 * `Remote` draws it with its popover or sheet; `LazyRemote` draws it alone
 * until the Remote arrives, so both look and read the same.
 */
export default function RemoteTrigger({
  after,
  className,
  iconSize,
  ink,
  label,
  size,
  ...button
}: Props) {
  const classes = remoteTriggerStyles(size, className);
  const inkStyle = ink ? ({ '--remote-ink': ink } as CSSProperties) : undefined;
  return (
    <span className="contents" style={inkStyle}>
      <button
        aria-haspopup="menu"
        aria-label={label}
        className={classes}
        title={label}
        type="button"
        {...button}
      >
        <Icon glyph={moreGlyph} size={iconSize} />
      </button>
      {after}
    </span>
  );
}
