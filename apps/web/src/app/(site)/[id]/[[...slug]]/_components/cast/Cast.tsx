import Face, { type FaceLook } from '@/components/ui/faces/Face';
import { GHOST_FILL, GhostLine } from '@/components/ui/row/RowGhosts';
import SectionUnavailable from '@/components/ui/row/SectionUnavailable';
import { isUnavailable } from '@/lib/cache/unavailable';
import personPath from '@/lib/routing/personPath';
import { type CastMember, loadCast } from '../../_data/loaders';

/**
 * The row's space, the same above and below, between what shows: "Created
 * by" to the faces, and the faces (or their names, below lg) to the season
 * header's text. Desktop 56px above and 72px below: the names show on hover
 * only and hang 56px below the faces without taking space (`-mb-14` on each
 * face cancels their 12px + 44px), so the row keeps 16px between a hovered
 * name and the season header; the 67px bottom margin collapses with the
 * episodes section's 40px (plus the header's 5px inset). A face that is left
 * stays above its neighbours until it has shrunk back. md to lg 40px: the names sit under
 * the faces; the -8px margin collapses with the section's 40px to 32 (plus
 * the 8px inset of the role line and the header). Phones draw no cast.
 */
const CAST_SPACE = 'mt-9 -mb-2 lg:mt-13 lg:mb-[67px]';

const listStyles = `${CAST_SPACE} grid grid-cols-3 gap-4 md:grid-cols-6 lg:flex lg:w-[973px] lg:max-w-full lg:flex-wrap lg:gap-0 lg:pt-4`;

/**
 * A face as production draws it: 96px from lg, overlapping its neighbours;
 * on hover or focus it grows (1.15) and the name and role fade up below it.
 * Below lg the row's cell (a sixth of the row on md, a third on phones) with
 * the name and role under it. The shared TMDB loader picks the face crop for
 * the density (the 138 crop or its 2× 276); the intrinsic size is the 96px
 * box at 2×.
 */
// Each place keeps its own look on purpose; don't unify them.
const CAST_FACE: FaceLook = {
  blank:
    'mx-auto aspect-square w-full rounded-full border-2 border-white bg-white/10 lg:size-24',
  caption:
    'mt-2 flex w-full flex-col items-center gap-1 whitespace-nowrap text-center lg:mt-3 lg:gap-0 lg:-translate-y-[15px] lg:opacity-0 lg:transition-[opacity,translate] lg:duration-300 lg:ease-[cubic-bezier(.2,.8,.2,1)] lg:group-hover/avatar:translate-y-0 lg:group-hover/avatar:opacity-100 lg:group-focus-visible/avatar:translate-y-0 lg:group-focus-visible/avatar:opacity-100',
  link: 'group/avatar relative z-0 flex w-full flex-col outline-none max-md:[&:nth-child(n+7)]:hidden lg:-mt-4 lg:-mr-4 lg:-mb-14 lg:w-24 lg:[transition:z-index_0s_300ms] lg:hover:z-10 lg:hover:[transition:z-index_0s] lg:focus-visible:z-10 lg:focus-visible:[transition:z-index_0s]',
  name: 'text-body-sm font-semibold max-lg:truncate max-lg:w-full',
  photo:
    'mx-auto aspect-square h-auto w-full rounded-full border-2 border-white object-cover transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-focus-visible/avatar:outline-2 group-focus-visible/avatar:outline-white group-focus-visible/avatar:outline-offset-2 lg:size-24 lg:group-hover/avatar:scale-115 lg:group-focus-visible/avatar:scale-115',
  role: 'text-caption text-white/60 max-lg:truncate max-lg:w-full',
  size: 192,
  sizes: '(min-width: 1024px) 96px, (min-width: 768px) 17vw, 34vw',
};

function CastFace({ person }: Readonly<{ person: CastMember }>) {
  const label = person.character
    ? `${person.name} as ${person.character}`
    : person.name;
  const href = personPath(person.id, person.slug);
  return (
    <Face
      alt={person.name}
      href={href}
      image={person.image}
      label={label}
      look={CAST_FACE}
      name={person.name}
      role={person.character}
    />
  );
}

/**
 * The cast as production draws it: ten overlapping 96px avatars that
 * grow and show the name and role on hover (ep0-cast); a grid
 * with names under them below 1024px (six on phones).
 */
export default async function Cast({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const cast = await loadCast(seriesId);
  if (isUnavailable(cast)) {
    return (
      <SectionUnavailable
        id="cast"
        inset="flush"
        placeholder={<CastSkeleton />}
        title="The cast"
      />
    );
  }
  if (cast.length === 0) {
    return <div className={`${CAST_SPACE} lg:min-h-24`} />;
  }
  return (
    <div className={listStyles} data-slot="cast">
      {cast.map((person) => (
        <CastFace key={person.id} person={person} />
      ))}
    </div>
  );
}

/**
 * The avatars' space while the credits load: flat ghost faces, and below
 * 1024px the name and role lines under them (the wide row shows those on
 * hover only, so there they hold space unseen). One pulsing layer.
 */
export function CastSkeleton() {
  const placeholders = Array.from({ length: 10 }, (_, index) => index);
  return (
    <div
      aria-hidden="true"
      className={`${listStyles} animate-ghost`}
      data-placeholder="cast"
    >
      {placeholders.map((index) => (
        <span
          className="flex w-full flex-col max-md:[&:nth-child(n+7)]:hidden lg:-mt-4 lg:-mr-4 lg:-mb-14 lg:w-24"
          key={index}
        >
          <span
            className={`mx-auto aspect-square w-full rounded-full lg:size-24 ${GHOST_FILL}`}
          />
          <span className="mt-2 flex flex-col items-center gap-1 lg:invisible lg:mt-3 lg:gap-0">
            <GhostLine className="h-6" inPulse look="loading" width="w-3/4" />
            <GhostLine className="h-5" inPulse look="loading" width="w-1/2" />
          </span>
        </span>
      ))}
    </div>
  );
}
