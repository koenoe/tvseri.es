import Image from 'next/image';
import { userGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import cn from '@/lib/cn';

import EnterChip from './EnterChip';
import OptionLink, { type OptionProps } from './OptionLink';
import { MARKED_RING, OPTION_PRESS } from './optionStyles';

/**
 * A recent show or person as a chip: a small poster or face and the name. A
 * member (found by their handle; members have no picture) gets the person
 * icon in the face's place.
 */
export default function RecentOption({ cell, marked, onChoose }: OptionProps) {
  const isShow = cell.kind === 'show';
  const classes = cn(
    'relative inline-flex h-12 items-center gap-3 rounded-12 bg-black/5 pr-4 pl-2 text-rk-ink hover:bg-black/8',
    OPTION_PRESS,
    marked && MARKED_RING,
  );
  const imageClasses = isShow
    ? 'h-9 w-6 rounded-4 object-cover'
    : 'size-8 rounded-full object-cover object-[center_20%]';

  return (
    <OptionLink
      cell={cell}
      className={classes}
      marked={marked}
      onChoose={onChoose}
    >
      {cell.kind === 'member' ? (
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-black/5 text-rk-w64"
        >
          <Icon glyph={userGlyph} size={16} />
        </span>
      ) : cell.image ? (
        <Image
          alt=""
          className={imageClasses}
          height={isShow ? 36 : 32}
          loading="eager"
          src={cell.image}
          width={isShow ? 24 : 32}
        />
      ) : null}
      <span className="text-body-sm font-medium text-rk-w80">{cell.name}</span>
      {marked ? <EnterChip className="ml-1" /> : null}
    </OptionLink>
  );
}
