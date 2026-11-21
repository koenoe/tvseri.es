import Image from 'next/image';
import { userGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SectionError } from '@/components/ui/row/RowError';
import SectionHead from '@/components/ui/section/SectionHead';
import TileLink from '@/components/ui/tile/TileLink';
import { TILE_HOVER } from '@/components/ui/tile/tileHover';
import { PERSON_PREFETCH } from '@/components/ui/tile/tilePrefetch';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import { loadCollaborators } from '@/lib/person/loaders';
import {
  COLLABORATOR_GRID,
  COLLABORATOR_ROLE_LINE,
  COLLABORATOR_TILE,
  PERSON_SECTION,
  PERSON_SNAP_ROW,
} from './layout';
import { CollaboratorsSkeleton } from './Skeletons';

/** Six across from lg, a snap row of 96px faces below */
const ROW = cn(PERSON_SNAP_ROW, COLLABORATOR_GRID);

const TILE = cn('group snap-start', COLLABORATOR_TILE);

/** The face and the one tile hover (`tileHover`: a 4% grow) */
const FACE = `image-rim relative block h-[120px] w-24 overflow-hidden rounded-10 bg-white/7 lg:aspect-4/5 lg:h-auto lg:w-full ${TILE_HOVER}`;

const ROLE = `truncate text-white/60 ${COLLABORATOR_ROLE_LINE}`;

/**
 * Frequent collaborators (snap row):
 * six faces with name and role, each linking to their person page.
 */
export default async function Collaborators({ id }: Readonly<{ id: number }>) {
  const people = await loadCollaborators(id);
  if (isUnavailable(people)) {
    return (
      <SectionError
        inset="flush"
        placeholder={<CollaboratorsSkeleton />}
        state="unavailable"
        title="Frequent collaborators"
      />
    );
  }
  if (people.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="person-collaborators"
      className={PERSON_SECTION}
      data-slot="person-collaborators"
    >
      <SectionHead id="person-collaborators" title="Frequent collaborators" />
      <div className={ROW}>
        {people.map((person) => (
          <TileLink
            aria-label={person.aria}
            className={TILE}
            data-slot="person-collaborator"
            href={person.href}
            key={person.id}
            prefetchOn={PERSON_PREFETCH}
          >
            <span className={FACE}>
              {person.image ? (
                <Image
                  alt=""
                  className="object-cover object-[center_15%]"
                  fill
                  sizes="(min-width: 1024px) 128px, 96px"
                  src={person.image}
                />
              ) : (
                // contrast-exempt: the no-photo person icon
                <span className="absolute inset-0 flex items-center justify-center text-white/50">
                  <Icon glyph={userGlyph} size={20} />
                </span>
              )}
            </span>
            <b className="truncate text-body-sm font-semibold">{person.name}</b>
            <span className={ROLE}>{person.role}</span>
          </TileLink>
        ))}
        <span aria-hidden="true" className="w-0 shrink-0 lg:hidden" />
      </div>
    </section>
  );
}
