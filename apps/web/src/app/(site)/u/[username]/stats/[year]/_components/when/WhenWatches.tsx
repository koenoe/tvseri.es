import { plural } from '@tvseri.es/utils';
import BarTip from '@/components/ui/chart/BarTip';
import ChartTable from '@/components/ui/chart/ChartTable';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { moonGlyph, sunGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';
import { getWhen, isUnavailable } from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import {
  barHeightRatio,
  bulkNote,
  daytimeText,
  hourRange,
  nightShareText,
  peakIndex,
  peakText,
  WEEKDAY_NAMES,
} from './model';

const HOUR_AXIS = ['00', '06', '12', '18', '23'] as const;
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const CAPTION = 'text-caption text-white/60';
const HOUR_CAPTION = cn(CAPTION, 'mt-2 flex justify-between tabular-nums');
const WEEKDAY_CAPTION = cn(CAPTION, 'mt-2 flex gap-2');

/**
 * "When {name} watches": the busiest weekday and hour as a headline, the
 * share after 8 pm and where the daytime watching falls, the 24 hour bars and
 * the 7 weekday bars (the peak white), and a note on bulk marks left out.
 * The phone keeps the headline and the hour bars only.
 */
export default async function WhenWatches({ user, year }: SectionProps) {
  const when = await getWhen(user.id, year);
  if (isUnavailable(when)) {
    return (
      <StatsUnavailable
        placeholder={<WhenWatchesSkeleton />}
        title={`When ${user.username} watches`}
      />
    );
  }
  const peak = peakText(when.weekdays, when.hours);
  if (!peak) {
    return null;
  }
  const note = bulkNote(when.bulkExcluded);
  return (
    <Lane
      className="max-md:p-4"
      id="when-title"
      title={`When ${user.username} watches`}
    >
      <div className="flex flex-col gap-2">
        <span className="text-title-2">{peak}</span>
        <MetaRow className="max-md:hidden">
          <MetaItem icon={moonGlyph}>{nightShareText(when.hours)}</MetaItem>
          <MetaItem icon={sunGlyph}>{daytimeText(when.daytime)}</MetaItem>
        </MetaRow>
      </div>
      <Bars
        className="h-[72px] gap-[3px] [--bar-h:72px] md:h-[88px] md:gap-1 md:[--bar-h:88px]"
        label="Episodes by hour of day"
        tip={hourRange}
        values={when.hours}
      />
      <div className={HOUR_CAPTION}>
        {HOUR_AXIS.map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>
      <div className="hidden md:contents">
        <div className="h-1" />
        <Bars
          className="h-12 gap-2 [--bar-h:48px]"
          label="Episodes by day of the week"
          tip={weekdayTip}
          values={when.weekdays}
        />
        <div className={WEEKDAY_CAPTION}>
          {WEEKDAY_LETTERS.map((letter, index) => (
            <span className="flex-1 text-center" key={WEEKDAY_NAMES[index]}>
              {letter}
            </span>
          ))}
        </div>
        {note ? <span className={CAPTION}>{note}</span> : null}
      </div>
    </Lane>
  );
}

const weekdayTip = (day: number) => WEEKDAY_NAMES[day] ?? '';

/**
 * A row of bars: each as tall as its share of the highest, at
 * least 2px, the peak white, hovering one whitens it and shows its tooltip
 * (mouse only: the bars are hidden from assistive tech and a visually hidden
 * table stands in for them). The height is `--bar-h` (set per breakpoint by
 * the caller).
 */
function Bars({
  className,
  label,
  tip,
  values,
}: Readonly<{
  className: string;
  label: string;
  tip: (index: number) => string;
  values: ReadonlyArray<number>;
}>) {
  const max = Math.max(0, ...values);
  const peak = peakIndex(values);
  const rows = values.map((episodes, index) => ({
    episodes,
    label: tip(index),
  }));
  const barsClass = cn('flex items-end', className);
  return (
    <>
      <ChartTable caption={label} rows={rows} />
      <div aria-hidden className={barsClass}>
        {values.map((value, index) => (
          <Bar
            episodes={value}
            key={index}
            peak={index === peak}
            ratio={barHeightRatio(value, max)}
            tip={tip(index)}
          />
        ))}
      </div>
    </>
  );
}

function Bar({
  episodes,
  peak,
  ratio,
  tip,
}: Readonly<{
  episodes: number;
  peak: boolean;
  ratio: number;
  tip: string;
}>) {
  const style = {
    height: `max(2px, round(calc(var(--bar-h) * ${ratio}), 1px))`,
  };
  const fill = peak ? 'bg-white' : 'bg-white/22';
  const barClass = cn(
    'block w-full rounded-2 [transition:background-color_.12s] group-hover/bar:bg-white',
    fill,
  );
  return (
    <span className="group/bar relative flex h-full min-w-0 flex-1 items-end justify-center">
      <i className={barClass} style={style} />
      <BarTip title={plural(episodes, 'episode')}>{tip}</BarTip>
    </span>
  );
}

/**
 * The lane's height: padding 36, head 24, headline block 56, the 88px hour
 * bars with their axis (8 + 20), a 4px spacer, the 48px weekday bars with
 * letters and the note, all 16px apart (444px). On a phone the headline, 72px
 * bars and the axis (232px).
 */
export function WhenWatchesSkeleton() {
  const title = (
    <span className="flex items-center gap-1.5">
      When <TextLine className="text-title-3" width="w-14" /> watches
    </span>
  );
  return (
    <LaneGhost className="h-[406px] max-md:h-[214px]" title={title}>
      <TextLine bar="h-5" className="text-title-2" width="w-48" />
      <TextLine className="text-meta" width="w-56" />
      <Ghost className="min-h-0 flex-1 rounded-6" />
      <TextLine className="text-caption" width="w-2/3" />
    </LaneGhost>
  );
}
