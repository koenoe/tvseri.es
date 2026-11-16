import { LazyShowRemote, LazyTileRemote } from '@/components/remote/LazyRemote';
import { BACKDROP, SHADOW, SURFACE } from '@/components/ui/dialog/dialogStyles';
import { TextLine } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import Section from './Section';
import { OnStill, Specimen, State } from './Specimen';

/** A 1440 × 810 page at 50%: the page, the dim over it, the 600px panel */
const FRAME =
  'relative h-[405px] w-full max-w-180 overflow-hidden rounded-12 bg-page shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]';
const DIM = cn('absolute inset-0', BACKDROP.side);
const PANEL = cn(
  'absolute inset-y-0 right-0 flex w-[300px] flex-col gap-3 p-4',
  SURFACE.sheet,
  SHADOW.sheet,
);
const LINES = ['w-3/4', 'w-1/2', 'w-2/3', 'w-3/5', 'w-2/5'];

/** Side panels over the dimmed page (static), and the ⋯ that loads the Remote. */
export default function PanelSection() {
  return (
    <Section
      id="panels"
      source="boards README “Side panels”, MNFinal, CMFinal"
      title="Side panels and the ⋯"
    >
      <Specimen
        board="dialogStyles BACKDROP.side, SURFACE.sheet, SHADOW.sheet (static, 50%)"
        className="block"
        label="A side panel: the page behind dimmed and inactive"
      >
        <div className={FRAME}>
          <div className="flex flex-col gap-4 p-8">
            {LINES.map((width) => (
              <TextLine className="text-title-3" key={width} width={width} />
            ))}
          </div>
          <div className={DIM} />
          <div className={PANEL}>
            <p className="text-title-3">Watch history</p>
            <p className="text-meta text-white/60">34 of 47 watched</p>
          </div>
        </div>
      </Specimen>
      <Specimen
        board="LazyRemote: the ⋯ first, the Remote's code on first intent"
        label="The lazy ⋯ trigger (no dark fill)"
      >
        <OnStill>
          <State name="on a tile (32)">
            <LazyTileRemote
              historyHref="/136315/the-bear?history"
              seriesId={136315}
              seriesName="The Bear"
            />
          </State>
          <State name="on a hero (48)">
            <LazyShowRemote
              hasAired
              historyHref="/136315/the-bear?history"
              seriesId={136315}
              seriesName="The Bear"
            />
          </State>
        </OnStill>
      </Specimen>
    </Section>
  );
}
