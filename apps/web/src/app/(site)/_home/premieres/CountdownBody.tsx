import type { Premiere } from '@tvseri.es/schemas';
import type { CSSProperties } from 'react';

import { calendarGlyph, seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import TitleTreatment, {
  TITLE_LOGO_FIT,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import showPath from '@/lib/routing/showPath';

import {
  COUNTDOWN_BODY,
  COUNTDOWN_COUNT,
  COUNTDOWN_FACTS,
  COUNTDOWN_LOGO,
  COUNTDOWN_NUMBER,
  COUNTDOWN_TITLE_TEXT,
  COUNTDOWN_TONIGHT,
  COUNTDOWN_TRACK,
  COUNTDOWN_UNIT,
} from './countdownLayout';
import {
  countdownChip,
  countdownDate,
  countdownFill,
  countdownSeason,
  countdownUnit,
} from './format';

/** The show's logo in the countdown's 260 × 48 box, else its title written */
// Each place keeps its own look on purpose; don't unify them.
const COUNTDOWN_TITLE_LOOK: TitleTreatmentLook = {
  box: COUNTDOWN_LOGO,
  logo: TITLE_LOGO_FIT,
  sizes: '260px',
  text: COUNTDOWN_TITLE_TEXT,
};

/**
 * One premiere's foreground: the count with "days to
 * go" on its baseline, the line that fills over the last 30 days with the
 * pink dot, the logo (or the written title; it opens the show), then the
 * pink date and the season. The same with one
 * premiere or three.
 */
export default function CountdownBody({
  premiere,
}: Readonly<{ premiere: Premiere }>) {
  const { daysAway, series } = premiere;
  const fill: CSSProperties = { width: `${countdownFill(daysAway)}%` };
  const dot: CSSProperties = { left: `${countdownFill(daysAway)}%` };
  const open = `Open ${series.title}`;
  const chip = countdownChip(daysAway);
  const href = showPath(series.id, series.slug);
  return (
    <div className={COUNTDOWN_BODY}>
      {daysAway > 0 ? (
        <span className={COUNTDOWN_COUNT}>
          <b className={COUNTDOWN_NUMBER}>{daysAway}</b>
          <small className={COUNTDOWN_UNIT}>{countdownUnit(daysAway)}</small>
        </span>
      ) : (
        <b className={COUNTDOWN_TONIGHT}>Tonight</b>
      )}
      <span aria-label={chip} className={COUNTDOWN_TRACK} role="img">
        <i
          className="absolute inset-y-0 left-0 rounded-2 bg-white"
          style={fill}
        />
        <b
          className="absolute -top-1 -ml-[5px] size-2.5 rounded-full bg-pink"
          style={dot}
        />
      </span>
      <TileLink
        aria-label={open}
        backdrop={series.backdropImage}
        className="block max-w-full"
        href={href}
      >
        <TitleTreatment
          look={COUNTDOWN_TITLE_LOOK}
          src={series.titleTreatmentImage}
          title={series.title}
        />
      </TileLink>
      <MetaRow className={COUNTDOWN_FACTS} fit="drop">
        <MetaItem icon={calendarGlyph} tone="pink">
          {countdownDate(premiere.date)}
        </MetaItem>
        <MetaItem icon={seasonGlyph}>
          {countdownSeason(premiere.kind, premiere.seasonNumber)}
        </MetaItem>
      </MetaRow>
    </div>
  );
}
