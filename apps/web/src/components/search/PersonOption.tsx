import Image from 'next/image';
import { starGlyph, userGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';

import EnterChip from './EnterChip';
import OptionLink, { type OptionProps } from './OptionLink';
import { HOVER_RING, MARKED_RING, OPTION_PRESS } from './optionStyles';
import { PERSON } from './resultLayout';

/**
 * A person: a round face, the name, the role and what they're known for
 * (the people row). On a phone the cell is 96 px wide in a sideways
 * strip, with a 64 px face, the name on up to two lines and no known-for.
 */
export default function PersonOption({ cell, marked, onChoose }: OptionProps) {
  const classes = cn('group', PERSON.tile, OPTION_PRESS);
  const nameClasses = cn(
    PERSON.name,
    'truncate font-semibold text-rk-text max-md:line-clamp-2 max-md:whitespace-normal',
  );
  const roleClasses = cn(PERSON.role, 'text-rk-w64');
  const knownForClasses = cn(PERSON.knownFor, 'text-rk-w64');
  const faceClasses = cn(
    'rounded-full object-cover object-[center_20%] transition-shadow duration-120',
    marked ? MARKED_RING : HOVER_RING,
  );

  return (
    <OptionLink
      cell={cell}
      className={classes}
      marked={marked}
      onChoose={onChoose}
    >
      <span className={PERSON.face}>
        <Image
          alt=""
          className={faceClasses}
          fill
          loading="eager"
          sizes="72px"
          src={cell.image}
        />
        {marked ? (
          <EnterChip className="absolute -right-1 -bottom-0.5" overImage />
        ) : null}
      </span>
      <span className={nameClasses} title={cell.name}>
        {cell.name}
      </span>
      <MetaRow className={roleClasses}>
        <MetaItem icon={userGlyph} shrink>
          {cell.role}
        </MetaItem>
      </MetaRow>
      <MetaRow className={knownForClasses}>
        <MetaItem icon={starGlyph} shrink>
          {cell.knownFor}
        </MetaItem>
      </MetaRow>
    </OptionLink>
  );
}
