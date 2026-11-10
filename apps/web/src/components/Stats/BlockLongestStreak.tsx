import { getStatsSummary } from '@/lib/api';
import formatPlural from '@/utils/formatPlural';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export default async function BlockLongestStreak({ userId, year }: Input) {
  const summary = await getStatsSummary({ userId, year });

  const delta = summary.current.longestStreak - summary.previous.longestStreak;
  const comparison = {
    delta,
    previousValue: formatPlural(summary.previous.longestStreak, 'day'),
    type: 'absolute',
  } as const;
  const value = formatPlural(summary.current.longestStreak, 'day');

  return <Block comparison={comparison} label="Longest streak" value={value} />;
}
