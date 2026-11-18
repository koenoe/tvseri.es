import {
  importedCount,
  liveRate,
  progressOf,
  type RunState,
} from '../_lib/importState';
import LiveCard from './LiveCard';

/** The live counter while it runs. */
export default function RunLive({ run }: Readonly<{ run: RunState }>) {
  const imported = importedCount(run);
  const progress = progressOf(run);
  const rate = liveRate(run);
  return (
    <LiveCard
      current={run.current}
      imported={imported}
      progress={progress}
      rate={rate}
      stopped={false}
      total={run.total}
    />
  );
}
