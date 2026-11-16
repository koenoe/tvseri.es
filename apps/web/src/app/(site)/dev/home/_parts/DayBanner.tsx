import { isInApiWindow } from '../../../_home/data/day';
import { planOf } from '../../../_home/data/plan';

/** What `/dev/home?day=` shows: the day's plan, fixed in a corner so the page's layout is Home's own */
export default function DayBanner({ day }: Readonly<{ day: string }>) {
  const plan = planOf(day);
  const outside = !isInApiWindow(day);
  return (
    <aside className="fixed bottom-4 left-4 z-50 max-w-[min(560px,calc(100vw-32px))] rounded-12 bg-black/85 p-3 text-meta text-white/80 shadow-lg">
      <p className="text-body-sm font-semibold text-white">
        Home on {day} (UTC), dev preview
      </p>
      <p>
        Feature: {plan.feature} · toy: {plan.toy}
        {plan.ifYouLiked ? ' (signed in: If you liked X)' : ''}. The Countdown
        replaces the feature when the next big premiere is 3 days away or less.
      </p>
      {outside ? (
        <p className="text-pink">
          Outside the API&apos;s window (yesterday to tomorrow): the feature and
          the toy are today&apos;s build of the kinds this day plans, the rows
          and personal rows today&apos;s answers; the deck, Hidden gems and the
          day counts are this day&apos;s.
        </p>
      ) : null}
      <p>
        <a className="underline" href="/dev/home">
          All kinds
        </a>{' '}
        ·{' '}
        <a className="underline" href="/dev/home/rules">
          How Home works
        </a>
      </p>
    </aside>
  );
}
