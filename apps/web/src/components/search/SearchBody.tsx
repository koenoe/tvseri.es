import { plural } from '@tvseri.es/utils';
import { type MouseEvent, memo } from 'react';

import cn from '@/lib/cn';
import type { SearchCell, SearchLayout } from '@/lib/search/sections';
import type { SessionView } from '@/lib/search/session';

import GhostResults from './GhostResults';
import { LISTBOX_ID } from './optionStyles';
import ResultBlock from './ResultBlock';
import StatusLine from './StatusLine';

type Props = Readonly<{
  layout: SearchLayout;
  onChoose: (cell: SearchCell, event: MouseEvent<HTMLAnchorElement>) => void;
  onRetry: () => void;
  view: SessionView;
}>;

/** What the live region counts per block: singular, plural */
const NOUNS = {
  members: ['member', 'members'],
  people: ['person', 'people'],
  shows: ['series', 'series'],
} as const;

function announce(view: SessionView) {
  if (view.mode === 'none') {
    return `Nothing for ${view.shownQuery}`;
  }
  if (view.mode === 'error') {
    return 'Search didn’t load';
  }
  if (view.mode !== 'results') {
    return '';
  }
  return view.sections
    .map((section) => {
      const [one, many] = NOUNS[section.kind];
      return plural(section.cells.length, one, many);
    })
    .join(', ');
}

/**
 * The panel body's height on desktop is held at its max while it shows rows
 * (ghosts or results): it grows once and stays, so nothing moves
 * when an answer lands. "Nothing for …" and a failed search
 * are one line, so the panel is as small as that line, never an empty
 * white sheet.
 */
const BODY =
  'min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-gutter py-6 [scrollbar-color:rgb(0_0_0/0.2)_transparent] [scrollbar-width:thin] md:max-h-[min(400px,calc(100dvh-14rem))] md:flex-none md:p-4';
const BODY_LOCKED = 'md:h-[min(400px,calc(100dvh-14rem))]';

/** What a request out for over 250 ms does to what is on screen */
const SHOWN = {
  fresh: 'opacity-100 transition-opacity duration-150 ease-out',
  stale: 'opacity-50 transition-opacity duration-200 ease-linear',
} as const;

/**
 * Under the field: the recents (empty field), the result blocks (the best
 * block first), or one status line. Scrolls inside the panel. The previous
 * results stay while the next ones load; a request out for over 250 ms fades
 * them (and a status line) to 50%, or, on the first query, puts ghost rows
 * where the recents were. Memoised: a keystroke re-renders the
 * field, and the body only once what it draws changes (`useOverlaySearch`
 * keeps `view` and the handlers stable while typing).
 */
function SearchBody({ layout, onChoose, onRetry, view }: Props) {
  const markedKey = view.cells[view.selected]?.key;
  const recents = { cells: view.cells, kind: 'recent' } as const;
  const announcement = announce(view);
  // held for the rows (ghosts, results); a status line is as tall as itself
  const held = view.mode === 'ghosts' || view.mode === 'results';
  const bodyClasses = cn(BODY, held && BODY_LOCKED);
  // the ghosts are the placeholder themselves: they never dim
  const shownClasses =
    view.stale && view.mode !== 'ghosts' ? SHOWN.stale : SHOWN.fresh;

  return (
    <div className={bodyClasses}>
      <div className={shownClasses}>
        <div
          aria-busy={view.stale}
          aria-label="Results"
          id={LISTBOX_ID}
          role="listbox"
        >
          {view.mode === 'recents' && view.cells.length > 0 ? (
            <ResultBlock
              first
              markedKey={markedKey}
              onChoose={onChoose}
              section={recents}
            />
          ) : null}
          {view.mode === 'ghosts' ? <GhostResults layout={layout} /> : null}
          {view.mode === 'results' ? (
            <Results
              markedKey={markedKey}
              onChoose={onChoose}
              sections={view.sections}
            />
          ) : null}
        </div>
        <StatusLine
          mode={view.mode}
          onRetry={onRetry}
          query={view.shownQuery}
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** The result blocks; fresh ones (after the recents, ghosts or a status line) fade in over 150 ms. */
function Results({
  markedKey,
  onChoose,
  sections,
}: Readonly<{
  markedKey: string | undefined;
  onChoose: Props['onChoose'];
  sections: SessionView['sections'];
}>) {
  return (
    <div className="transition-opacity duration-150 ease-out starting:opacity-0">
      {sections.map((section, index) => {
        const first = index === 0;
        return (
          <ResultBlock
            first={first}
            key={section.kind}
            markedKey={markedKey}
            onChoose={onChoose}
            section={section}
          />
        );
      })}
    </div>
  );
}

const MemoSearchBody = memo(SearchBody);
MemoSearchBody.displayName = 'SearchBody';

export default MemoSearchBody;
