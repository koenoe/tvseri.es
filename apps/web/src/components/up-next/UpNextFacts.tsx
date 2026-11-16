import {
  calendarGlyph,
  clockGlyph,
  flagGlyph,
  onAirGlyph,
  seasonGlyph,
  usersGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';

import type { UpNextFact } from './upNextCopy';
import { UP_NEXT_FACTS } from './upNextLayout';

const GLYPHS: Readonly<Record<UpNextFact['kind'], Glyph>> = {
  aired: calendarGlyph,
  finale: flagGlyph,
  latest: onAirGlyph,
  left: seasonGlyph,
  next: calendarGlyph,
  people: usersGlyph,
  runtime: clockGlyph,
  seasons: seasonGlyph,
  status: flagGlyph,
  total: clockGlyph,
  trending: onAirGlyph,
};

/** What the phone leaves out (HMFinalMobile: "58m · Next Sun 15 Nov") */
const DESKTOP_ONLY: ReadonlySet<UpNextFact['kind']> = new Set([
  'latest',
  'finale',
]);

function Fact({ fact }: Readonly<{ fact: UpNextFact }>) {
  const className = DESKTOP_ONLY.has(fact.kind) ? 'max-md:hidden' : undefined;
  const tone = fact.highlight ? 'highlight' : undefined;
  return (
    <MetaItem className={className} icon={GLYPHS[fact.kind]} tone={tone}>
      {fact.text}
    </MetaItem>
  );
}

/**
 * The card's facts line (`cs-mrow`): one icon per fact, the key one lighter;
 * facts that don't fit drop whole from the end
 */
export default function UpNextFacts({
  facts,
}: Readonly<{ facts: ReadonlyArray<UpNextFact> }>) {
  return (
    <MetaRow className={UP_NEXT_FACTS} fit="drop">
      {facts.map((fact) => (
        <Fact fact={fact} key={fact.kind} />
      ))}
    </MetaRow>
  );
}
