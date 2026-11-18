import type { CirclePerson } from '@tvseri.es/schemas';

import { GLASS } from '@/components/ui/glass/glass';
import { levelLabel, personLabel } from '../../../_lib/circleCopy';
import { RingArcs } from '../../blocks/MatchRing';
import { CHIP_RING } from '../../blocks/matchRingLooks';
import { LEVELS } from '../../visitor/match/levels';

const CHIP_CLASS = `inline-flex h-8 max-w-full items-center gap-[7px] whitespace-nowrap rounded-full bg-white/5 pr-3 pl-2 text-caption text-white/80 ${GLASS}`;

/** One person behind a pick: ring, name, "Super match" */
export default function PersonChip({
  person,
}: Readonly<{ person: CirclePerson }>) {
  const label = levelLabel(person.level);
  const levelClass = person.level ? LEVELS[person.level].text : '';
  const levelWordClass = `-mr-[3px] shrink-0 font-medium ${levelClass}`;
  const ariaLabel = personLabel(person);
  return (
    <span aria-label={ariaLabel} className={CHIP_CLASS}>
      <RingArcs arc={person.arc} level={person.level} look={CHIP_RING} />
      <b className="mr-0.5 min-w-0 truncate font-medium text-white">
        {person.username}
      </b>
      {label ? (
        <>
          <span className={levelWordClass}>{label}</span>
          <span className="shrink-0 text-white/60">match</span>
        </>
      ) : null}
    </span>
  );
}
