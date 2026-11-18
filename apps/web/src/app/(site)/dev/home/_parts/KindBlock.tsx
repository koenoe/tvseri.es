import { daysBetweenUtc, plural } from '@tvseri.es/utils';
import type { ReactNode } from 'react';

type Props = Readonly<{
  children?: ReactNode;
  /** `kind-…`, for screenshots */
  id: string;
  kind: string;
  /** the next day the kind is planned, null when not within 60 days */
  next: string | null;
  note: string;
  /** what the API draws on `next`; null when it can't say yet */
  onNext?: string | null;
  today: string;
}>;

const when = (day: string, today: string) => {
  const days = daysBetweenUtc(today, day);
  const date = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    weekday: 'short',
  });
  return days === 0 ? `today (${date})` : `${date}, in ${plural(days, 'day')}`;
};

const verdict = (kind: string, onNext: string | null | undefined) => {
  if (onNext === undefined) {
    return null;
  }
  if (onNext === null) {
    return 'The API decides on the day (it answers yesterday to tomorrow only).';
  }
  if (onNext.startsWith('The API failed')) {
    return `The API didn't answer for that day (${onNext}).`;
  }
  if (onNext === kind) {
    return 'The API draws it that day.';
  }
  return onNext === 'nothing'
    ? 'The API has nothing for the slot that day.'
    : `The API falls through that day: it draws ${onNext}.`;
};

/** A dev label over a moment: its kind, when it next appears, and what the API does then */
export default function KindBlock({
  children,
  id,
  kind,
  next,
  note,
  onNext,
  today,
}: Props) {
  const fall = verdict(kind, onNext);
  return (
    <section className="flex flex-col gap-4" id={id}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-1 px-gutter">
        <p className="text-overline text-cyan uppercase">{kind}</p>
        <p className="text-body-sm text-white/80">
          Next on Home: {next ? when(next, today) : 'not in the next 60 days'}.
          {fall ? ` ${fall}` : ''}
        </p>
        <p className="text-meta text-white/60">{note}</p>
      </div>
      {children}
    </section>
  );
}
