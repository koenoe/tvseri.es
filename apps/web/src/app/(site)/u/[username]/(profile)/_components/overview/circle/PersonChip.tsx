import type { CirclePerson } from '@tvseri.es/schemas';

import { GLASS } from '@/components/ui/glass/glass';
import { levelLabel } from '../../../_lib/circleCopy';
import LevelMeter from '../../blocks/LevelMeter';
import { LEVELS } from '../../visitor/match/levels';

const CHIP_CLASS = `inline-flex h-8 max-w-full items-center gap-[7px] whitespace-nowrap rounded-full bg-white/5 pr-3 pl-2 text-caption text-white/80 ${GLASS}`;

/** One person behind a pick: level meter, name, "Super match" */
export default function PersonChip({
  person,
}: Readonly<{ person: CirclePerson }>) {
  const label = levelLabel(person.level);
  const levelClass = person.level ? LEVELS[person.level].text : '';
  const levelWordClass = `-mr-[3px] shrink-0 font-medium ${levelClass}`;
  return (
    <span className={CHIP_CLASS}>
      <LevelMeter level={person.level} size="chip" />
      <b className="mr-0.5 min-w-0 truncate font-medium text-white">
        {person.username}
      </b>
      {label ? (
        <>
          {/* read as "juno, Super match": the flex gaps are not spaces */}
          <span className="sr-only">, </span>
          <span className={levelWordClass}>{label}</span>{' '}
          <span className="shrink-0 text-white/60">match</span>
        </>
      ) : null}
    </span>
  );
}
