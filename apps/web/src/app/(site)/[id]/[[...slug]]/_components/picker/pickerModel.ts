import { episodeCode, shortCode } from '@tvseri.es/schemas';
import { format, isSameDay, parseISO, subDays } from 'date-fns';

import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { WEEKDAY_PATTERN } from '@/lib/format/date';
import { formatWhen } from '@/lib/format/when';
import { WHOLE_SHOW } from '@/lib/marking/copy';
import { codeOf, episodeState, isWatchedState } from '@/lib/marking/progress';
import type { EpisodeRef, SeriesBase, WatchRecord } from '@/lib/marking/types';
import { lastWeekend, type WhenChoice } from '@/lib/marking/when';

import type { PickerRequest } from '../../_lib/dialogs';

/**
 * The date picker's copy and options: the
 * title and subline, When (with each date), Without a day and which one is
 * the current answer. Pure: `now` and the episode's title/air date come in.
 */
export type PickerAnswer =
  | WhenChoice
  | Readonly<{ kind: 'skip' }>
  | Readonly<{ kind: 'unmark' }>;

export type PickerOption = Readonly<{
  key: string;
  label: string;
  /** The date beside it ("Mon 9 Nov"); empty for Without a day. */
  hint: string;
  isNew: boolean;
  /** The episode's current answer. */
  on: boolean;
  answer: PickerAnswer;
}>;

export type PickerEpisode = Readonly<{ title: string; airDate: string }>;

export type PickerModel = Readonly<{
  title: string;
  subtitle: string;
  quick: ReadonlyArray<PickerOption>;
  alt: ReadonlyArray<PickerOption>;
  /** The watched day of one dated episode (the selected cell). */
  selected: Date | null;
}>;

const shortDay = (date: Date) => format(date, WEEKDAY_PATTERN);

type Current =
  | 'now'
  | 'yesterday'
  | 'weekend'
  | 'release'
  | 'unknown'
  | 'skip'
  | null;

/** Which answer one episode's record matches (its day, no date, skipped). */
function currentOf(
  state: ReturnType<typeof episodeState>,
  record: WatchRecord | undefined,
  airDate: string | undefined,
  now: number,
): Current {
  if (state === 'skipped') {
    return 'skip';
  }
  if (!record) {
    return null;
  }
  if (record.dateUnknown) {
    return 'unknown';
  }
  const day = record.watchedAt;
  if (isSameDay(day, now)) {
    return 'now';
  }
  if (isSameDay(day, subDays(now, 1))) {
    return 'yesterday';
  }
  if (isSameDay(day, lastWeekend(now))) {
    return 'weekend';
  }
  return airDate && isSameDay(day, parseISO(airDate)) ? 'release' : null;
}

function statusOf(
  current: Current,
  record: WatchRecord | undefined,
  now: number,
): string {
  if (current === 'skip') {
    return 'Skipped';
  }
  if (!record) {
    return 'Not watched yet';
  }
  if (record.dateUnknown) {
    return 'Watched, don’t remember when';
  }
  return `Currently ${formatWhen(record.watchedAt, now, { capital: false })}`;
}

export function pickerModel(
  input: Readonly<{
    request: PickerRequest;
    view: SeriesBase;
    showTitle: string;
    now: number;
    /** One episode's title and air date, once its season has loaded. */
    episode?: PickerEpisode;
  }>,
): PickerModel {
  const { episode, now, request, view } = input;
  const one: EpisodeRef | undefined =
    request.kind === 'one' ? request.refs[0] : undefined;
  const record = one ? view.watched[codeOf(one)] : undefined;
  const state = one ? episodeState(view, one) : 'none';
  const current = one ? currentOf(state, record, episode?.airDate, now) : null;

  const option = (
    key: Exclude<Current, null> | 'unmark',
    label: string,
    hint: string,
    answer: PickerAnswer,
  ): PickerOption => ({
    answer,
    hint,
    isNew: key === 'unknown' || key === 'skip',
    key,
    label,
    on: current === key,
  });

  const release = one
    ? episode?.airDate
      ? formatAirWeekdayDate(episode.airDate, now)
      : ''
    : 'Each air date';
  const quick = [
    option('now', 'Just now', `Today, ${format(now, 'HH:mm')}`, {
      kind: 'now',
    }),
    option('yesterday', 'Yesterday', shortDay(subDays(now, 1)), {
      kind: 'yesterday',
    }),
    option('weekend', 'Last weekend', shortDay(lastWeekend(now)), {
      kind: 'weekend',
    }),
    option('release', 'On release day', release, { kind: 'release' }),
  ];

  const hasSomething = request.refs.some((ref) => {
    const item = episodeState(view, ref);
    return isWatchedState(item) || item === 'skipped';
  });
  const alt = [
    option('unknown', 'I don’t remember', '', { kind: 'unknown' }),
    option('skip', 'Skipped', '', { kind: 'skip' }),
    ...(request.kind !== 'run' && hasSomething
      ? [option('unmark', 'Not watched', '', { kind: 'unmark' })]
      : []),
  ];

  const title = one
    ? `When did you watch ${shortCode(one.episodeNumber)}?`
    : `When did you watch ${
        request.what === WHOLE_SHOW ? input.showTitle : request.what
      }?`;
  const subtitle = one
    ? [episodeCode(one), episode?.title, statusOf(current, record, now)]
        .filter(Boolean)
        .join(' · ')
    : `One date for all ${request.refs.length} episodes`;

  return {
    alt,
    quick,
    selected: record && !record.dateUnknown ? new Date(record.watchedAt) : null,
    subtitle,
    title,
  };
}
