'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

import { variantHourglassGlyph } from '@/components/ui/icon/glyphs';
import { formatDuration } from '@/lib/format/duration';
import { plural } from '@/lib/format/text';
import showPath from '@/lib/routing/showPath';
import { useLocalDay } from '@/lib/viewer/useLocalDay';

import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';

import BingeChoices from './BingeChoices';
import BingeControls from './BingeControls';
import BingeFooter from './BingeFooter';
import type { BingeChoice } from './choices';
import { useElementWidth } from './hooks';
import {
  BINGE_CARD,
  BINGE_HEAD,
  BINGE_HEADLINE,
  BINGE_HEADLINE_FACTS,
  BINGE_HEADLINE_LINK,
  BINGE_PICKERS,
  DEFAULT_MODE,
  DEFAULT_PER_NIGHT,
} from './layout';
import NightStrip from './NightStrip';
import {
  BOARD_STRIP_WIDTH,
  legendLabel,
  type NightsMode,
  nightsSummary,
  type PerNight,
  planBinge,
} from './plan';

/**
 * Any day stands in until the viewer's is known: with Every night (the only
 * mode before a click) the plan's shape doesn't depend on the day, only its
 * date labels, which wait for the real day.
 */
const STAND_IN_DAY = '2026-11-11';

const LEGEND_DOT = 'block size-2.5 rounded-full';

function Legend({ perNight }: Readonly<{ perNight: number }>) {
  return (
    <div className="flex flex-wrap items-center gap-6 text-caption text-white/60">
      <span className="inline-flex items-center gap-2">
        <i className={`${LEGEND_DOT} bg-white/72`} />
        {legendLabel(perNight)}
      </span>
      <span className="inline-flex items-center gap-2">
        <i
          className={`${LEGEND_DOT} shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.2)]`}
        />
        A night off
      </span>
    </div>
  );
}

/**
 * The Binge calculator (HMFinal `e3-bc`): pick a show, episodes a night and
 * which nights; the headline, the night strip and the finish date follow.
 * Headed by its label inside the card (`e3-bch`), no title above. The only
 * client island of the feature of the day.
 */
export default function BingeCalculator({
  choices,
  today: fixedToday,
}: Readonly<{
  choices: ReadonlyArray<BingeChoice>;
  /** A fixed `YYYY-MM-DD` (the dev preview); the page uses the viewer's */
  today?: string;
}>) {
  const labelId = useId();
  const [selected, setSelected] = useState(0);
  const [perNight, setPerNight] = useState<PerNight>(DEFAULT_PER_NIGHT);
  const [mode, setMode] = useState<NightsMode>(DEFAULT_MODE);
  const viewerToday = useLocalDay();
  const today = fixedToday ?? viewerToday;
  const [width, measure] = useElementWidth(BOARD_STRIP_WIDTH);
  const choice = choices[selected] ?? choices[0];
  const seasons = choice?.seasons;
  const plan = useMemo(
    () =>
      planBinge({
        mode,
        perNight,
        seasons: seasons ?? [],
        today: today ?? STAND_IN_DAY,
        width,
      }),
    [mode, perNight, seasons, today, width],
  );
  if (!choice) {
    return null;
  }

  const episodes = choice.seasons.reduce((sum, count) => sum + count, 0);
  const total = formatDuration(episodes * choice.runtime);
  const dated = today !== null;
  const href = showPath(choice.id, choice.slug);
  const nights = plural(plan.nights, 'night');
  return (
    <section aria-labelledby={labelId} className={BINGE_CARD}>
      <div className={BINGE_HEAD}>
        <MomentLabel
          glyph={variantHourglassGlyph}
          id={labelId}
          title={FEATURE_TITLE.binge}
        />
        <h3 className={BINGE_HEADLINE}>
          <Link className={BINGE_HEADLINE_LINK} href={href}>
            {choice.title}
          </Link>{' '}
          in {nights}{' '}
          <em className={BINGE_HEADLINE_FACTS}>
            · {episodes} episodes, {total}
          </em>
        </h3>
      </div>
      <div className={BINGE_PICKERS}>
        <BingeChoices
          choices={choices}
          onChoose={setSelected}
          selected={selected}
        />
        <BingeControls
          mode={mode}
          nightLength={formatDuration(perNight * choice.runtime)}
          onMode={setMode}
          onPerNight={setPerNight}
          perNight={perNight}
        />
      </div>
      <NightStrip dated={dated} plan={plan} ref={measure} />
      {mode === 'every' ? null : <Legend perNight={perNight} />}
      <BingeFooter
        choice={choice}
        dated={dated}
        finish={plan.finish}
        summary={nightsSummary(perNight, mode)}
      />
    </section>
  );
}
