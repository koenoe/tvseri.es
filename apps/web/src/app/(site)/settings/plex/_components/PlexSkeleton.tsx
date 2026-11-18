import type { ReactNode } from 'react';

import {
  segmentedItemStyles,
  segmentedStyles,
} from '@/components/ui/button/buttonStyles';
import {
  ButtonFace,
  FLAT,
  Ghost,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import {
  chevronDownGlyph,
  closeGlyph,
  copyGlyph,
  historyGlyph,
  linkGlyph,
} from '@/components/ui/icon/glyphs';
import { GHOST_FILL, GHOST_FILL_OVER } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { MD_BUTTON, SM_BUTTON } from '../../_lib/appButtons';
import { APP_CARD_CLASS } from './AppCard';
import AppHeader from './AppHeader';
import { APP_PILL_CLASS } from './AppPill';
import { APP_TILE_CLASS } from './AppTile';
import {
  APP_BODY_CLASS,
  APP_TOGGLE_CLASS,
  OPTION_LINE_CLASS,
  OPTION_ROW_CLASS,
  OPTION_TEXT_CLASS,
  OPTION_TITLE_CLASS,
  OPTIONS_CLASS,
  PAUSE_LINE,
  SEGMENT_CLASS,
  SEGMENTED_CLASS,
  SWITCH_BOX_CLASS,
  URL_FIELD_CLASS,
  WEEK_BAR_CLASS,
  WEEK_CLASS,
  WEEK_DAY_CLASS,
  WEEK_LETTER_CLASS,
} from './layout';
import PlexStatusLine from './PlexStatusLine';
import SetupSteps from './SetupSteps';

/** Which shape shows: `data-plex` on <html> (pre-paint, `lib/viewer/htmlHints.ts`). */
const SHOWN = {
  // not connected, also the default when no hint is on this browser
  none: 'block [html[data-plex=wait]_&]:hidden [html[data-plex=on]_&]:hidden [html[data-plex=paused]_&]:hidden',
  on: 'hidden [html[data-plex=on]_&]:block [html[data-plex=paused]_&]:block',
  wait: 'hidden [html[data-plex=wait]_&]:block',
} as const;

/** The "Whose plays count" control's box (`Segmented` with `PlexOptions`' sizes), labels unseen */
const SEGMENTED_GHOST = segmentedStyles({
  className: cn(SEGMENTED_CLASS, FLAT),
});
const SEGMENT_GHOST = segmentedItemStyles({ className: SEGMENT_CLASS });

/** The card's box as one flat pulsing layer: no brand edge, no amber panel */
const CARD = cn(APP_CARD_CLASS, 'animate-ghost', GHOST_FILL);

const WEEK_BAR_GHOST = cn(WEEK_BAR_CLASS, 'h-5 max-md:h-4');
const PILL_GHOST = cn(APP_PILL_CLASS, FLAT);
const URL_FIELD_GHOST = cn(URL_FIELD_CLASS, GHOST_FILL_OVER);
const OPTIONS_GHOST = cn(OPTIONS_CLASS, 'border-transparent');

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** The week's seven columns: a bar and a letter each (`WeekBars`) */
const GhostWeek = () => (
  <span className={WEEK_CLASS}>
    {DAYS.map((day) => (
      <span className={WEEK_DAY_CLASS} key={day}>
        <Ghost className={WEEK_BAR_GHOST} />
        <TextLine bar="h-2.5" className={WEEK_LETTER_CLASS} width="w-2" />
      </span>
    ))}
  </span>
);

/**
 * The Last scrobble card in its own layout (`LastScrobble`): the overline,
 * the logo's box, the meta row (two lines on a phone) and the week at the
 * bottom right (under the meta row on a phone).
 */
const LAST_BOX = cn(
  'flex min-h-55 items-end rounded-16 p-6 max-md:min-h-47.5',
  GHOST_FILL,
);

const GhostLast = () => (
  <span className={LAST_BOX}>
    <span className="flex w-full items-end gap-5 max-md:flex-col max-md:items-start max-md:gap-3.5">
      <span className="flex min-w-0 flex-1 flex-col gap-3 max-md:w-full">
        <TextLine className="text-overline" width="w-24" />
        <Ghost className="h-11 w-40 rounded-6 max-md:h-8.5 max-md:w-32" />
        <span className="flex gap-4 max-md:flex-col max-md:gap-1">
          <TextLine className="text-meta" width="w-36" />
          <TextLine className="text-meta" width="w-24" />
        </span>
      </span>
      <GhostWeek />
    </span>
  </span>
);

/** Rows are 48px, 49 with the hairline; `data-plex-n` says how many show (3 without a hint). */
const GhostRecent = () => (
  <span className="flex h-36.5 flex-col overflow-hidden [html[data-plex-n='1']_&]:h-12 [html[data-plex-n='2']_&]:h-24.25 [html[data-plex-n='4']_&]:h-48.75 [html[data-plex-n='5']_&]:h-61">
    {[0, 1, 2, 3, 4].map((row) => (
      <span
        className="flex h-12.25 shrink-0 items-center border-white/6 border-t first:h-12 first:border-t-0"
        key={row}
      >
        <TextLine className="text-body-sm" width="w-48" />
      </span>
    ))}
  </span>
);

/**
 * Tile, name, status line, the three pills and the toggle (`AppHeader`'s own
 * grid). The not-connected and waiting lines are fixed copy, drawn as the
 * card draws them, so the header's height follows them.
 */
function HeaderGhost({
  state,
  status = <TextLine className="text-meta" width="w-28" />,
}: Readonly<{ state: string; status?: ReactNode }>) {
  const pills = (
    <>
      <span className={PILL_GHOST}>{state}</span>
      <span className={PILL_GHOST}>Built in</span>
      <span className={PILL_GHOST}>Needs Plex Pass</span>
    </>
  );
  const tile = <Ghost className={APP_TILE_CLASS} />;
  return (
    <AppHeader name="Plex" pills={pills} status={status} tile={tile}>
      <ButtonFace
        className={APP_TOGGLE_CLASS}
        size="md"
        trailingIcon={chevronDownGlyph}
        variant="tonal"
      >
        Hide
      </ButtonFace>
    </AppHeader>
  );
}

const NONE_STATUS = <PlexStatusLine lastReceivedAt={null} state="none" />;
const WAIT_STATUS = <PlexStatusLine lastReceivedAt={null} state="wait" />;

/** The URL with Show and Copy (`UrlField`) */
const UrlGhost = () => (
  <span className={URL_FIELD_GHOST}>
    <TextLine className="min-w-0 flex-1 text-body-sm" width="w-3/5" />
    {/* the eye's box (unseen: any 13px glyph sizes it the same) */}
    <ButtonFace className={SM_BUTTON} icon={copyGlyph} variant="quiet">
      Show
    </ButtonFace>
    <ButtonFace className={SM_BUTTON} icon={copyGlyph} variant="tonal">
      Copy
    </ButtonFace>
  </span>
);

/** One option: its static title, its line, its control's box (`PlexOptions`) */
function OptionGhost({
  children,
  line,
  title,
}: Readonly<{ children: ReactNode; line: ReactNode; title: string }>) {
  return (
    <span className={OPTION_ROW_CLASS}>
      <span className={OPTION_TEXT_CLASS}>
        <b className={OPTION_TITLE_CLASS}>{title}</b>
        {line}
      </span>
      {children}
    </span>
  );
}

/** Pause scrobbling, Whose plays count, then New URL and Disconnect */
function SettingsGhost() {
  const pause = <span className={OPTION_LINE_CLASS}>{PAUSE_LINE}</span>;
  const who = <TextLine className="text-meta" width="w-56" />;
  return (
    <>
      <span className={OPTIONS_GHOST}>
        <OptionGhost line={pause} title="Pause scrobbling">
          <Ghost className={SWITCH_BOX_CLASS} />
        </OptionGhost>
        <OptionGhost line={who} title="Whose plays count">
          <span className={SEGMENTED_GHOST}>
            <span className={SEGMENT_GHOST}>Only you</span>
            <span className={SEGMENT_GHOST}>Everyone</span>
          </span>
        </OptionGhost>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <ButtonFace
          className={MD_BUTTON}
          icon={historyGlyph}
          size="md"
          variant="tonal"
        >
          New URL
        </ButtonFace>
        <ButtonFace
          className={MD_BUTTON}
          icon={closeGlyph}
          size="md"
          variant="tonal"
        >
          Disconnect
        </ButtonFace>
      </span>
    </>
  );
}

/**
 * The Plex card while its status loads, as flat ghosts in the card's own
 * layout (no real card, no real buttons): the box, the header's tile, status
 * line, pills and toggle, the setup steps as their static text, and each
 * button as a flat pill its label sizes. The shape is the one this browser
 * last saw (`data-plex` on <html>, picked by CSS before the first paint):
 * not connected when there is no hint (the common state), waiting, or
 * receiving / paused (the last scrobble, the recent list, the URL and the
 * settings). Inert.
 */
export default function PlexSkeleton() {
  return (
    <div aria-hidden="true" inert>
      <div className={SHOWN.none}>
        <div className={CARD}>
          <HeaderGhost state="Available" status={NONE_STATUS} />
          <div className={APP_BODY_CLASS}>
            <SetupSteps hasUrl={false} />
            <span className="flex flex-wrap items-center gap-2">
              <ButtonFace
                className="px-6 font-semibold"
                icon={linkGlyph}
                size="md"
                variant="primary"
              >
                Create my Plex URL
              </ButtonFace>
            </span>
          </div>
        </div>
      </div>
      <div className={SHOWN.wait}>
        <div className={CARD}>
          <HeaderGhost state="Available" status={WAIT_STATUS} />
          <div className={APP_BODY_CLASS}>
            <UrlGhost />
            <SetupSteps hasUrl />
            <SettingsGhost />
          </div>
        </div>
      </div>
      <div className={SHOWN.on}>
        <div className={CARD}>
          <HeaderGhost state="Connected" />
          <div className={APP_BODY_CLASS}>
            <GhostLast />
            <GhostRecent />
            <UrlGhost />
            <SettingsGhost />
          </div>
        </div>
      </div>
    </div>
  );
}
