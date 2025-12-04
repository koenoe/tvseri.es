import { getStatsSummary } from '@/lib/api';

import Block from './Block';

type Input = Readonly<{
  userId: string;
  year: number;
}>;

export default async function BlockLongestStreak({ userId, year }: Input) {
  const summary = await getStatsSummary({ userId, year });

  const delta = summary.current.longestStreak - summary.previous.longestStreak;

  return (
    <Block
      comparison={{
        delta,
        previousValue: `${summary.previous.longestStreak} day${summary.previous.longestStreak === 1 ? '' : 's'}`,
        type: 'absolute',
      }}
      label="Longest streak"
      value={`${summary.current.longestStreak} day${summary.current.longestStreak === 1 ? '' : 's'}`}
    />
  );
}
