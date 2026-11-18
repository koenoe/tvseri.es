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
  'border-white/7 border-b [contain-intrinsic-size:auto_65px] [content-visibility:auto] md:[contain-intrinsic-size:auto_81px]';

/**
 * 8px in from the sides, so the hover's rounded fill clears the face, and
 * 8px out again (-mx-2), so faces and names stay on the sheet title's edge
 */
const ROW_BOX = '-mx-2 flex items-center gap-3 px-2 py-2.5 md:gap-4 md:py-3';

/** A section's name, on the rows' 8px inset */
const SECTION_TITLE = 'pt-4 pb-1 text-overline text-white/80 uppercase';

const CIRCLE = 'size-11 shrink-0 rounded-full md:size-14';

const GHOST_ROW = `${ROW} ${ROW_BOX}`;

const GHOST_CIRCLE = `${CIRCLE} ${GHOST_FILL}`;

// Each place keeps its own look on purpose; don't unify them.
const SHEET_FACE: FaceLook = {
  blank: `${CIRCLE} bg-white/10`,
  caption: 'flex min-w-0 flex-col',
  // the app's subtle row hover, not an underline: the whole row is the link
  link: `${ROW_BOX} rounded-8 outline-none transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-2`,
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
      <ul className="animate-ghost">
        {rows.map((index) => (
          <li className={GHOST_ROW} key={index}>
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
      <ul>
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
