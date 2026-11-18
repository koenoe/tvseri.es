'use client';

import { formatGrouped } from '@tvseri.es/utils';
import { startTransition, useCallback, useId, useState } from 'react';

import { SURFACE } from '@/components/ui/dialog/dialogStyles';
import Face, { type FaceLook } from '@/components/ui/faces/Face';
import ExpandButton, {
  type ExpandLayout,
} from '@/components/ui/fold/ExpandButton';
import { SectionError } from '@/components/ui/row/RowError';
import { GHOST_FILL, GhostLine } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import personPath from '@/lib/routing/personPath';
import {
  type CastAndCrew,
  type CastCrewPerson,
  crewLabel,
  faceLabel,
} from '@/lib/series/castAndCrew';
import useCachedJson, { requestJson } from '@/lib/series/useCachedJson';

import { useShow } from '../../_lib/ShowProvider';
import { castAndCrewUrl } from './castSheetData';

/**
 * A row: 44px faces on phones, 56 in the side panel, apart by spacing alone
 * (a divider between rounded hover fills looked wrong). Off-screen rows skip
 * layout and paint (`content-visibility`): a long-running show lists
 * hundreds. The intrinsic size is the row's real height, so the scrollbar
 * doesn't jump as rows render.
 */
const ROW =
  '[contain-intrinsic-size:auto_68px] [content-visibility:auto] md:[contain-intrinsic-size:auto_84px]';

/**
 * The list reaches 12px past the sheet's text edge on both sides: the rows'
 * hover fill gets room around the face while the faces and the section
 * titles keep that edge. On the list, not the rows:
 * a row's `content-visibility` clips whatever leaves its box.
 */
const LIST = '-mx-3';

/** 12px of padding, and 4px above and below so neighbouring hover fills never touch */
const ROW_BOX =
  'my-1 flex items-center gap-3 rounded-12 px-3 py-2 md:gap-4 md:py-2.5';

/** A section's name, on the sheet's text edge */
const SECTION_TITLE = cn(
  'pt-4 pb-1 text-overline text-white/80 uppercase',
  // The heading stays at the top of the sheet's scroll while its section
  // passes under it, on the sheet's own ground and as wide as the rows'
  // hover fill (-mx-3), so nothing shows round its edges. Its own compositing
  // layer (transform-gpu): Safari paints the rows' image layers over a sticky
  // element without one, whatever its z-index
  'sticky top-0 z-10 -mx-3 transform-gpu px-3',
  SURFACE.sheet,
);

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

/** A row's link name: "… as Character" for the cast, "…, Director" for the crew */
type RowLabel = (person: CastCrewPerson) => string;

function PersonRow({
  labelOf,
  person,
}: Readonly<{ labelOf: RowLabel; person: CastCrewPerson }>) {
  const href = personPath(person.id, person.slug);
  const label = labelOf(person);
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

/**
 * A section's first rows: a long-running show lists thousands (Grey's
 * Anatomy's cast is over 2,600), and a short first view keeps the sheet
 * scannable and its slide-in smooth. The regulars come first (billing order,
 * then most episodes); the rest open with "Show all N" in a transition, so
 * the press never blocks.
 */
const CAST_CAP = 20;
const CREW_CAP = 6;

/** The person page's full-width bar under its lists, here under a section */
const SHOW_ALL: ExpandLayout = {
  button:
    'mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-12 bg-white/5 px-4 font-medium text-body-sm text-white transition-colors hover:bg-white/8',
  chevron: 15,
};

/** One of the sheet's sections, under its name; none without anyone */
function Section({
  cap,
  labelOf,
  people,
  title,
}: Readonly<{
  /** how many show before "Show all" */
  cap: number;
  labelOf: RowLabel;
  people: ReadonlyArray<CastCrewPerson>;
  title: string;
}>) {
  const titleId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => {
    startTransition(() => setOpen((value) => !value));
  }, []);
  if (people.length === 0) {
    return null;
  }
  const capped = people.length > cap;
  const shown = open || !capped ? people : people.slice(0, cap);
  const showAll = `Show all ${formatGrouped(people.length)}`;
  return (
    <section aria-labelledby={titleId}>
      <h3 className={SECTION_TITLE} id={titleId}>
        {title}
      </h3>
      <ul className={LIST} id={listId}>
        {shown.map((person) => (
          <PersonRow key={person.id} labelOf={labelOf} person={person} />
        ))}
      </ul>
      {capped ? (
        <ExpandButton
          aria-controls={listId}
          label={showAll}
          layout={SHOW_ALL}
          onClick={toggle}
          open={open}
        />
      ) : null}
    </section>
  );
}

/**
 * Everyone, from the public, CDN-cached route (`/api/series/:id/credits`):
 * the Cast, then the crew in IMDb's sections (Created by, Directed by…), the rows' skeleton while it loads, the
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
      <Section
        cap={CAST_CAP}
        labelOf={faceLabel}
        people={people.cast}
        title="Cast"
      />
      {people.crew.map((section) => (
        <Section
          cap={CREW_CAP}
          key={section.title}
          labelOf={crewLabel}
          people={section.people}
          title={section.title}
        />
      ))}
    </>
  );
}
