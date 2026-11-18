import Image from 'next/image';
import { PANEL_GLASS } from '@/components/ui/glass/glass';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { GHOST_FILL, GhostLine } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { peopleCount } from '@/lib/series/castAndCrew';

import type { ShowCast } from '../../_data/loaders';
import CastSheetButton from './CastSheetButton';

/** Phones only: the desktop row takes over from md */
const STACK =
  'block w-full rounded-8 text-left outline-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4 md:hidden';

/** The stack overlaps so five faces and "+N" fit a phone's width in one line */
const CIRCLE =
  'size-15 shrink-0 rounded-full border-2 border-white not-first:-ml-2.5';

const PHOTO = cn(CIRCLE, 'object-cover object-top');

/** "+N": the first-tracking prompt's glass */
const MORE = cn(
  CIRCLE,
  'flex items-center justify-center font-semibold text-[15px]',
  PANEL_GLASS,
);

const LINE = 'mt-2.5 block truncate text-[13px] text-white/75 leading-5';

/**
 * The phone's cast: five faces of the cast (only those with a photo), "+N"
 * for the rest of the cast and a chevron, and a line naming the first two;
 * the whole of it opens the sheet with everyone, the crew too.
 */
export default function CastStack({ cast }: Readonly<{ cast: ShowCast }>) {
  const more = cast.castCount - cast.stack.length;
  const label = `Cast, ${peopleCount(cast.castCount)}`;
  return (
    <CastSheetButton className={STACK} label={label} total={cast.peopleCount}>
      <span aria-hidden="true" className="flex items-center">
        {cast.stack.map((person) => (
          <Image
            alt=""
            className={PHOTO}
            height={120}
            key={person.id}
            sizes="60px"
            src={person.image}
            width={120}
          />
        ))}
        {more > 0 ? <span className={MORE}>+{more}</span> : null}
        <Icon
          className="ml-auto text-white/60"
          glyph={chevronRightGlyph}
          size={20}
        />
      </span>
      <span aria-hidden="true" className={LINE}>
        <b className="font-semibold text-white">{cast.line.first}</b>
        {cast.line.rest}
      </span>
    </CastSheetButton>
  );
}

const GHOST_FACES = Array.from({ length: 6 }, (_, index) => index);

const GHOST_CIRCLE = cn(CIRCLE, 'border-transparent', GHOST_FILL);

/** The stack's space while the credits load: six circles and the line */
export function CastStackSkeleton() {
  return (
    <span className="block md:hidden">
      <span className="flex items-center">
        {GHOST_FACES.map((index) => (
          <span className={GHOST_CIRCLE} key={index} />
        ))}
      </span>
      <GhostLine className="mt-2.5 h-5" inPulse look="loading" width="w-3/4" />
    </span>
  );
}
