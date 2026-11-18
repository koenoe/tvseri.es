import Image from 'next/image';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { GHOST_FILL, GhostLine } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import {
  type CastCrewPerson,
  peopleCount,
  stackLine,
} from '@/lib/series/castAndCrew';

import type { ShowCast } from '../../_data/loaders';
import CastSheetButton from './CastSheetButton';

/** Phones only: the desktop row and "Created by" take over from md */
const STACK =
  'block w-full rounded-8 text-left outline-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4 md:hidden';

/** 60px faces with a 2px white ring, each over the last by 10px */
const CIRCLE =
  'size-15 shrink-0 rounded-full border-2 border-white not-first:-ml-2.5';

const PHOTO = cn(CIRCLE, 'object-cover object-top');

const BLANK = cn(CIRCLE, 'bg-white/10');

/** "+N": the first-tracking prompt's glass */
const MORE = cn(
  CIRCLE,
  'flex items-center justify-center bg-white/9 font-semibold text-[15px] backdrop-blur-[14px]',
);

const LINE = 'mt-2.5 block truncate text-[13px] text-white/75 leading-5';

function StackFace({ person }: Readonly<{ person: CastCrewPerson }>) {
  if (!person.image) {
    return <span className={BLANK} />;
  }
  return (
    <Image
      alt=""
      className={PHOTO}
      height={120}
      sizes="60px"
      src={person.image}
      width={120}
    />
  );
}

/**
 * The phone's cast: five faces (the creators first), "+N" and a chevron,
 * and a line naming the first two; the whole of it opens the sheet with
 * everyone. It stands in for "Created by" too, which phones hide.
 */
export default function CastStack({ cast }: Readonly<{ cast: ShowCast }>) {
  const total = cast.peopleCount;
  const more = total - cast.stack.length;
  const line = stackLine(cast.stack, total);
  const label = `Cast and crew, ${peopleCount(total)}`;
  return (
    <CastSheetButton className={STACK} label={label} total={total}>
      <span aria-hidden="true" className="flex items-center">
        {cast.stack.map((person) => (
          <StackFace key={person.id} person={person} />
        ))}
        {more > 0 ? <span className={MORE}>+{more}</span> : null}
        <Icon
          className="ml-auto text-white/60"
          glyph={chevronRightGlyph}
          size={20}
        />
      </span>
      <span aria-hidden="true" className={LINE}>
        <b className="font-semibold text-white">{line.first}</b>
        {line.rest}
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
