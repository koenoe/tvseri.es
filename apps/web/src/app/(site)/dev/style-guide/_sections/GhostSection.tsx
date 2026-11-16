import {
  ButtonFace,
  ButtonGhost,
  FLAT,
  Ghost,
  ghostCircle,
  Line,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { linkGlyph, playGlyph } from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import Section from './Section';
import { Specimen, State } from './Specimen';

const CARD = cn('flex w-72 flex-col gap-3 rounded-16 p-4', GHOST_FILL, PULSE);
const CHIP = cn('h-8 rounded-full px-3 text-caption', FLAT);

/**
 * The placeholders' parts (`components/ui/ghost`): flat fills, one pulsing
 * layer per card, text bars inside a line of the real type class.
 */
export default function GhostSection() {
  const circle = ghostCircle('size-10');
  return (
    <Section
      id="ghosts"
      source="the skeleton checklist (skeletons mirror the components)"
      title="Ghosts"
    >
      <Specimen board="ghosts.tsx" label="Shapes">
        <State name="Ghost (a box)">
          <Ghost className="h-24 w-16 rounded-8" />
        </State>
        <State name="ghostCircle">
          <span className={circle} />
        </State>
        <State name="Line (a bar, fixed height)">
          <Line className="h-4" width="w-32" />
        </State>
        <State name="TextLine in text-body-sm">
          <TextLine className="text-body-sm" width="w-40" />
        </State>
        <State name="TextLine in text-title-2">
          <TextLine className="text-title-2" width="w-40" />
        </State>
      </Specimen>
      <Specimen board="ghosts.tsx" label="Buttons and chips">
        <State name="ButtonFace (static label sizes it)">
          <ButtonFace icon={linkGlyph} size="md" variant="primary">
            Create my Plex URL
          </ButtonFace>
        </State>
        <State name="ButtonFace, trailing icon">
          <ButtonFace size="md" trailingIcon={playGlyph} variant="tonal">
            Hide
          </ButtonFace>
        </State>
        <State name="ButtonGhost (label from data)">
          <ButtonGhost icon={playGlyph} width="w-28" />
        </State>
        <State name="FLAT on a chip">
          <span className={CHIP}>Built in</span>
        </State>
      </Specimen>
      <Specimen board="ghosts.tsx" label="One pulsing layer per card">
        <div className={CARD}>
          <Ghost className="h-32 w-full rounded-12" />
          <TextLine className="text-body-sm" width="w-3/4" />
          <TextLine className="text-meta" width="w-1/2" />
        </div>
      </Specimen>
    </Section>
  );
}
