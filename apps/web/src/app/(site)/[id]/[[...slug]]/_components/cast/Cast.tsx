import type { Person } from '@tvseri.es/schemas';

import Face, { type FaceLook } from '@/components/ui/faces/Face';
import { SectionError } from '@/components/ui/row/RowError';
import { GHOST_FILL, GhostLine } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import personPath from '@/lib/routing/personPath';
import {
  type CastCrewPerson,
  faceLabel,
  peopleCount,
} from '@/lib/series/castAndCrew';
import { loadCast, type ShowCast } from '../../_data/loaders';
import CastSheetButton from './CastSheetButton';
import CastStack, { CastStackSkeleton } from './CastStack';

/**
 * The block's space, the same above and below, between what shows: "Created
 * by" to the faces, and the faces (or their names, below lg) to the season
 * header's text. Desktop 56px above and 72px below: the names show on hover
 * only and hang 56px below the faces without taking space (`-mb-14` on each
 * face cancels their 12px + 44px), so the row keeps 16px between a hovered
 * name and the season header; the 67px bottom margin collapses with the
 * episodes section's 40px (plus the header's 5px inset). A face that is left
 * stays above its neighbours until it has shrunk back. md to lg 40px: the names sit under
 * the faces; the -8px margin collapses with the section's 40px to 32 (plus
 * the 8px inset of the role line and the header). With no "Created by" (no
 * creators) the faces are the block's first line and take its place, 24px
 * under the hero, instead of keeping the gap meant for the line above them.
 * Phones: the stack, 32px under the hero's actions ("Created by" is hidden
 * there, so never the first-child rule), 32px above the episodes.
 */
const CAST_SPACE =
  'mt-8 -mb-2 md:mt-9 md:first:mt-6 lg:mt-13 lg:mb-[67px] lg:first:mt-6';

const ROW =
  'grid gap-4 max-md:hidden md:grid-cols-6 lg:flex lg:w-[973px] lg:max-w-full lg:flex-wrap lg:gap-0 lg:pt-4';
const GHOST_FACE = `mx-auto aspect-square w-full rounded-full lg:size-24 ${GHOST_FILL}`;

/**
 * A face: 96px from lg, overlapping its neighbours;
 * on hover or focus it grows (1.15) and the name and role fade up below it.
 * md to lg a sixth of the row with the name and role under it. The shared
 * TMDB loader picks the face crop for the density (the 138 crop or its 2×
 * 276); the intrinsic size is the 96px box at 2×.
 */
// Each place keeps its own look on purpose; don't unify them.
const CAST_FACE: FaceLook = {
  blank:
    'mx-auto aspect-square w-full rounded-full border-2 border-white bg-white/10 lg:size-24',
  caption:
    'mt-2 flex w-full flex-col items-center gap-1 whitespace-nowrap text-center lg:mt-3 lg:gap-0 lg:-translate-y-[15px] lg:opacity-0 lg:transition-[opacity,translate] lg:duration-300 lg:ease-[cubic-bezier(.2,.8,.2,1)] lg:group-hover/avatar:translate-y-0 lg:group-hover/avatar:opacity-100 lg:group-focus-visible/avatar:translate-y-0 lg:group-focus-visible/avatar:opacity-100',
  link: 'group/avatar relative z-0 flex w-full flex-col outline-none lg:-mt-4 lg:-mr-4 lg:-mb-14 lg:w-24 lg:[transition:z-index_0s_300ms] lg:hover:z-10 lg:hover:[transition:z-index_0s] lg:focus-visible:z-10 lg:focus-visible:[transition:z-index_0s]',
  name: 'text-body-sm font-semibold max-lg:truncate max-lg:w-full',
  photo:
    'mx-auto aspect-square h-auto w-full rounded-full border-2 border-white object-cover transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-focus-visible/avatar:outline-2 group-focus-visible/avatar:outline-white group-focus-visible/avatar:outline-offset-2 lg:size-24 lg:group-hover/avatar:scale-115 lg:group-focus-visible/avatar:scale-115',
  role: 'text-caption text-white/60 max-lg:truncate max-lg:w-full',
  size: 192,
  sizes: '(min-width: 1024px) 96px, 17vw',
};

/** "+N": a face's circle in the first-tracking prompt's glass */
const MORE_CIRCLE = cn(
  CAST_FACE.photo,
  'flex items-center justify-center bg-white/9 font-semibold text-[22px] backdrop-blur-[14px]',
);

function CastFace({ person }: Readonly<{ person: CastCrewPerson }>) {
  const label = faceLabel(person);
  const href = personPath(person.id, person.slug);
  return (
    <Face
      alt={person.name}
      href={href}
      image={person.image}
      label={label}
      look={CAST_FACE}
      name={person.name}
      role={person.role}
    />
  );
}

/**
 * After the tenth face, "+N" for the rest of the cast: it grows and names
 * itself like a face, and opens the side panel with everyone.
 */
function MoreFace({ cast }: Readonly<{ cast: ShowCast }>) {
  const more = cast.castCount - cast.faces.length;
  const total = cast.peopleCount;
  const label = `All ${total} cast and crew`;
  const people = peopleCount(total);
  return (
    <CastSheetButton className={CAST_FACE.link} label={label} total={total}>
      <span className={MORE_CIRCLE}>+{more}</span>
      <span aria-hidden="true" className={CAST_FACE.caption}>
        <b className={CAST_FACE.name}>All cast &amp; crew</b>
        <span className={CAST_FACE.role}>{people}</span>
      </span>
    </CastSheetButton>
  );
}

/**
 * The cast: ten overlapping 96px avatars that grow and show the name and
 * role on hover, then "+N" when there are more; a grid with names under
 * them from md to lg; on phones the stack that opens everyone.
 */
export default async function Cast({
  creators,
  seriesId,
}: Readonly<{ creators: ReadonlyArray<Person>; seriesId: number }>) {
  const cast = await loadCast(seriesId, creators);
  if (isUnavailable(cast)) {
    return (
      <SectionError
        inset="flush"
        placeholder={<CastSkeleton />}
        state="unavailable"
        title="The cast"
      />
    );
  }
  // Nothing is reserved without anyone: the episodes section's own top
  // margin is then the whole gap below the hero (or "Created by").
  if (cast.peopleCount === 0) {
    return null;
  }
  // creators but no cast: the stack on phones, nothing more on desktop
  // ("Created by" names them)
  const block = cn(CAST_SPACE, cast.faces.length === 0 && 'md:hidden');
  const hasMore = cast.castCount > cast.faces.length;
  return (
    <div className={block} data-slot="cast">
      <CastStack cast={cast} />
      {cast.faces.length > 0 ? (
        <div className={ROW}>
          {cast.faces.map((person) => (
            <CastFace key={person.id} person={person} />
          ))}
          {hasMore ? <MoreFace cast={cast} /> : null}
        </div>
      ) : null}
    </div>
  );
}

const SKELETON_BLOCK = `${CAST_SPACE} animate-ghost`;
const GHOST_FACES = Array.from({ length: 10 }, (_, index) => index);

/**
 * The cast's space while the credits load: the phone's stack; from md flat
 * ghost faces, and below lg the name and role lines under them (the wide
 * row shows those on hover only, so there they hold space unseen). One
 * pulsing layer.
 */
export function CastSkeleton() {
  return (
    <div aria-hidden="true" className={SKELETON_BLOCK} data-placeholder="cast">
      <CastStackSkeleton />
      <div className={ROW}>
        {GHOST_FACES.map((index) => (
          <span
            className="flex w-full flex-col lg:-mt-4 lg:-mr-4 lg:-mb-14 lg:w-24"
            key={index}
          >
            <span className={GHOST_FACE} />
            <span className="mt-2 flex flex-col items-center gap-1 lg:invisible lg:mt-3 lg:gap-0">
              <GhostLine className="h-6" inPulse look="loading" width="w-3/4" />
              <GhostLine className="h-5" inPulse look="loading" width="w-1/2" />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
