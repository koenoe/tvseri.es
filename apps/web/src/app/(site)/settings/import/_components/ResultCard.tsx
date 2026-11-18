import { formatGrouped, plural } from '@tvseri.es/utils';
import type { CSSProperties } from 'react';
import Button from '@/components/ui/button/Button';
import ButtonLink from '@/components/ui/button/ButtonLink';
import {
  checkGlyph,
  historyGlyph,
  infoGlyph,
  undoGlyph,
  userGlyph,
  warningGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { ImportedShow } from '@/lib/import/contract';
import profilePath from '@/lib/routing/profilePath';
import {
  OUTCOME_COPY,
  OUTCOME_RGB,
  type Outcome,
  percentOf,
} from '../_lib/outcome';
import Ripple from './Ripple';
import { SOLID_BUTTON } from './styles';
import TopShows from './TopShows';

const OUTCOME_ICON = {
  good: checkGlyph,
  low: warningGlyph,
  mid: infoGlyph,
} as const;

type Props = Readonly<{
  imported: number;
  importable: number;
  /** Added by fixes after the import: "+18 after you sorted some out" */
  extra: number;
  outcome: Outcome;
  rate: number;
  showCount: number;
  shows: ReadonlyArray<ImportedShow>;
  topTitle: string;
  username: string;
  undoing: boolean;
  onLeave: () => void;
  onUndo: () => void;
}>;

/**
 * The result: the outcome pill (text and icon, never colour alone), the
 * number with its
 * accent, the next steps, then the shows with the most imported episodes.
 * The Ripple settles once; the page glow is `OutcomeGlow`.
 */
export default function ResultCard(props: Props) {
  const { extra, imported, importable, outcome, rate, showCount, username } =
    props;
  const tone = { '--rc': OUTCOME_RGB[outcome] } as CSSProperties;
  const copy = OUTCOME_COPY[outcome];
  const rateLine = `${formatGrouped(imported)} of ${formatGrouped(importable)} imported · ${percentOf(rate)}`;
  const shows = `episodes from ${plural(showCount, 'series is', 'series are')} in your history now`;
  const history = profilePath(username, 'history');
  const profile = profilePath(username);
  return (
    <div
      className="relative flex flex-col gap-8 overflow-hidden rounded-[24px] bg-white/3 px-12 pt-12 pb-8 shadow-[inset_0_0_0_1px_rgb(var(--rc)/0.2)] max-md:gap-6 max-md:px-6 max-md:pb-6"
      style={tone}
    >
      <Ripple className="top-[150px] max-md:top-[110px]" mode="settle" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full bg-[rgb(var(--rc)/0.18)] pr-4 pl-3 text-body-sm shadow-[inset_0_0_0_1px_rgb(var(--rc)/0.5)] max-md:h-auto max-md:flex-wrap max-md:justify-center max-md:px-3 max-md:py-2 max-md:whitespace-normal">
          <Icon
            className="size-3.5 text-[rgb(var(--rc))]"
            glyph={OUTCOME_ICON[outcome]}
            size={16}
          />
          <b className="font-semibold text-white">{copy.head}</b>
          <span className="text-white/80 tabular-nums">{rateLine}</span>
        </span>
        <b className="flex flex-col items-center text-numeral-xl tabular-nums [text-shadow:0_0_40px_rgb(var(--rc)/0.3)]">
          {formatGrouped(imported)}
          <span
            aria-hidden="true"
            className="mt-4 block h-1 w-14 rounded-2 bg-[rgb(var(--rc))]"
          />
        </b>
        <span className="text-body text-white/80">{shows}</span>
        <span className="text-body-sm text-white/80">{copy.sub}</span>
        {extra > 0 ? (
          <span className="text-meta leading-5 text-cyan">{`+${formatGrouped(extra)} after you sorted some out`}</span>
        ) : null}
        <span className="mt-3 flex flex-wrap justify-center gap-2 max-md:w-full max-md:flex-col">
          <ButtonLink
            className={SOLID_BUTTON}
            href={history}
            icon={historyGlyph}
            onClick={props.onLeave}
            variant="primary"
          >
            View history
          </ButtonLink>
          <ButtonLink
            className="px-4 has-[>svg:first-child]:pl-4"
            href={profile}
            icon={userGlyph}
            onClick={props.onLeave}
            variant="tonal"
          >
            Go to your profile
          </ButtonLink>
          <Button
            className="has-[>svg:first-child]:pl-4"
            icon={undoGlyph}
            onClick={props.onUndo}
            pending={props.undoing}
            variant="quiet"
          >
            {props.undoing ? 'Undoing…' : 'Undo import'}
          </Button>
        </span>
      </div>
      <TopShows count={showCount} shows={props.shows} title={props.topTitle} />
    </div>
  );
}
