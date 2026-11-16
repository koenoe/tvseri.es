import type { ConnectedPerson, TvSeries } from '@tvseri.es/schemas';
import Image from 'next/image';
import TileLink from '@/components/ui/tile/TileLink';
import { PERSON_PREFETCH } from '@/components/ui/tile/tilePrefetch';

import personPath from '@/lib/routing/personPath';
import showPath from '@/lib/routing/showPath';

import { roleLine } from './copy';

/** A node: its image over the name (and a person's roles); shared with the placeholder */
export const NODE =
  'group flex w-[112px] shrink-0 flex-col items-center gap-1.5 text-center md:w-[150px]';
export const NAME =
  'text-body-sm font-semibold text-white group-hover:underline';

/**
 * The card is 272px from md (HMFinal `e2-gr`), room for one line of name and
 * one of roles under the images: longer ones clamp there, two lines each on
 * a phone (112px nodes, where the card grows), with the full text in the
 * hover title and the link's name (names went past the card).
 */
const NODE_CLAMP = 'line-clamp-2 max-w-full break-words md:line-clamp-1';

/**
 * On a phone a name and the roles always take their two lines' box, so the
 * card is as tall whatever the day's names (its placeholder draws the same)
 */
const NAME_TEXT = `${NAME} ${NODE_CLAMP} min-h-12 md:min-h-0`;
const IMAGE = 'block object-cover shadow-[0_8px_16px_rgb(0_0_0/0.3)]';

/** A show's poster box, empty (no poster, or the placeholder) */
export const SHOW_EMPTY = 'block h-[126px] w-[84px] rounded-[9px] bg-white/5';

/** A person's face box, empty (no photo, or the placeholder) */
export const PERSON_EMPTY =
  'my-[21px] block size-[84px] rounded-full bg-white/5';

export const ROLES = 'text-caption text-white/60';

const ROLES_TEXT = `${ROLES} ${NODE_CLAMP} min-h-10 md:min-h-0`;

/** A show in the chain: its 84 × 126 poster (9px corners) and title */
export function ShowNode({ series }: Readonly<{ series: TvSeries }>) {
  return (
    <TileLink
      aria-label={series.title}
      className={NODE}
      href={showPath(series.id, series.slug)}
    >
      {series.posterImage ? (
        <Image
          alt=""
          className={`${IMAGE} h-[126px] w-[84px] rounded-[9px]`}
          height={126}
          sizes="84px"
          src={series.posterImage}
          width={84}
        />
      ) : (
        <span className={SHOW_EMPTY} />
      )}
      <b className={NAME_TEXT} title={series.title}>
        {series.title}
      </b>
    </TileLink>
  );
}

/** A person in the chain: an 84px round face, the name, the roles */
export function PersonNode({ person }: Readonly<{ person: ConnectedPerson }>) {
  const roles = roleLine(person.characters);
  const label = roles ? `${person.name}, ${roles}` : person.name;
  return (
    <TileLink
      aria-label={label}
      className={NODE}
      href={personPath(person.id, person.slug)}
      prefetchOn={PERSON_PREFETCH}
    >
      {person.image ? (
        <Image
          alt=""
          className={`${IMAGE} my-[21px] size-[84px] rounded-full object-[center_18%]`}
          height={84}
          sizes="84px"
          src={person.image}
          width={84}
        />
      ) : (
        <span className={PERSON_EMPTY} />
      )}
      <b className={NAME_TEXT} title={person.name}>
        {person.name}
      </b>
      {/* without roles the box stays, so the chain keeps its height */}
      <small
        aria-hidden={roles ? undefined : true}
        className={ROLES_TEXT}
        title={roles || undefined}
      >
        {roles}
      </small>
    </TileLink>
  );
}
