import { formatGrouped } from '@/lib/formatCount';

/**
 * Under the diary: while older months remain, that they load as
 * you scroll; at the true end, where the undated episodes are (they have no
 * day to sit on). Nothing at the end when every episode has a date.
 */
export default function DiaryEnd({
  more,
  owner,
  undated,
}: Readonly<{ more: boolean; owner: boolean; undated: number }>) {
  const text = more
    ? 'Older months load as you scroll.'
    : undated > 0
      ? undatedLine(undated, owner)
      : null;
  return text ? (
    <p className="pt-5 text-caption text-white/60">{text}</p>
  ) : null;
}

function undatedLine(undated: number, owner: boolean) {
  const totals = owner ? 'your totals' : 'the totals';
  return undated === 1
    ? `1 episode marked “I don’t remember” has no date: it counts in ${totals} and sits in its series’ own history.`
    : `${formatGrouped(undated)} episodes marked “I don’t remember” have no date: they count in ${totals} and sit in each series’ own history.`;
}
