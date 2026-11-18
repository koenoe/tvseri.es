'use client';

import { useId } from 'react';

import Face, { type FaceLook } from '@/components/ui/faces/Face';
import { SectionError } from '@/components/ui/row/RowError';
import { GHOST_FILL, GhostLine } from '@/components/ui/row/RowGhosts';
import personPath from '@/lib/routing/personPath';
import {
  type CastAndCrew,
  type CastCrewPerson,
  faceLabel,
} from '@/lib/series/castAndCrew';
import useCachedJson, { requestJson } from '@/lib/series/useCachedJson';

import { useShow } from '../../_lib/ShowProvider';
import { castAndCrewUrl } from './castSheetData';

/**
 * A row: 44px faces on phones, 56 in the side panel. Off-screen rows skip
 * layout and paint (`content-visibility`): a long-running show lists
 * hundreds.
 */
const ROW =
  'relative [contain-intrinsic-size:auto_69px] [content-visibility:auto] after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-white/7 md:[contain-intrinsic-size:auto_85px]';

/**
 * The list reaches 12px past the sheet's text edge on both sides: the rows'
 * hover fill gets room around the face while the faces, the dividers (inset
 * 12px) and the section titles keep that edge. On the list, not the rows:
 * a row's `content-visibility` clips whatever leaves its box.
 */
const LIST = '-mx-3';

/** 12px of padding and a 4px gap to the dividers, for the rounded hover fill */
const ROW_BOX =
  'my-1 flex items-center gap-3 rounded-12 px-3 py-2 md:gap-4 md:py-2.5';

/** A section's name, on the sheet's text edge */
const SECTION_TITLE = 'pt-4 pb-1 text-overline text-white/80 uppercase';

const CIRCLE = 'size-11 shrink-0 rounded-full md:size-14';

const GHOST_LIST = `${LIST} animate-ghost`;

const GHOST_CIRCLE = `${CIRCLE} ${GHOST_FILL}`;

// Each place keeps its own look on purpose; don't unify them.
const SHEET_FACE: FaceLook = {
  blank: `${CIRCLE} bg-white/10`,
  caption: 'flex min-w-0 flex-col',
  // the app's subtle row hover, not an underline: the whole row is the link
  link: `${ROW_BOX} outline-none transition-colors hover:bg-white/6 focus-visible:bg-white/6 focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-2`,
  name: 'truncate font-semibold text-[14px] leading-5 md:text-[15px] md:leading-[22px]',
  photo: `${CIRCLE} object-cover object-top`,
  role: 'truncate text-[12px] text-white/60 leading-4 md:text-[13px] md:leading-[18px]',
  size: 112,
  sizes: '56px',
};

function PersonRow({ person }: Readonly<{ person: CastCrewPerson }>) {
  const href = personPath(person.id, person.slug);
  const label = faceLabel(person);
  return (
    <li className={ROW}>
      <Face
        alt=""
        href={href}
        image={person.image}
        label={label}
        look={SHEET_FACE}
        name={person.name}
        role={person.role}
      />
    </li>
  );
}

/**
 * The rows while the list loads: as many as will show, up to a screen's
 * worth, under the Cast heading, which every sheet has (it opens from the
 * cast)
 */
function RowsSkeleton({ count }: Readonly<{ count: number }>) {
  const rows = Array.from({ length: Math.min(count, 10) }, (_, index) => index);
  return (
    <div aria-hidden="true" data-placeholder="cast-sheet">
      <p className={SECTION_TITLE}>Cast</p>
      <ul className={GHOST_LIST}>
        {rows.map((index) => (
          <li className={ROW} key={index}>
            <span className={ROW_BOX}>
              <span className={GHOST_CIRCLE} />
              <span className="flex flex-col">
                <GhostLine
                  className="h-5 md:h-[22px]"
                  inPulse
                  look="loading"
                  width="w-40"
                />
                <GhostLine
                  className="h-4 md:h-[18px]"
                  inPulse
                  look="loading"
                  width="w-28"
                />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One of the sheet's sections, under its name; none without anyone */
function Section({
  people,
  title,
}: Readonly<{ people: ReadonlyArray<CastCrewPerson>; title: string }>) {
  const titleId = useId();
  if (people.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={titleId}>
      <h3 className={SECTION_TITLE} id={titleId}>
        {title}
      </h3>
      <ul className={LIST}>
        {people.map((person) => (
          <PersonRow key={person.id} person={person} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Everyone, from the public, CDN-cached route (`/api/series/:id/credits`),
 * in two sections, Cast then Crew: the rows' skeleton while it loads, the
 * section's failed card over it with Try again when it fails.
 */
export default function CastSheetList({ total }: Readonly<{ total: number }>) {
  const url = castAndCrewUrl(useShow().id);
  const people = useCachedJson<CastAndCrew>(url);
  if (people === undefined) {
    return <RowsSkeleton count={total} />;
  }
  if (people === null) {
    const retry = () => requestJson(url);
    const placeholder = <RowsSkeleton count={total} />;
    return (
      <SectionError
        inset="flush"
        onRetry={retry}
        placeholder={placeholder}
        state="failed"
        title="The cast and crew"
      />
    );
  }
  return (
    <>
      <Section people={people.cast} title="Cast" />
      <Section people={people.crew} title="Crew" />
    </>
  );
}
