'use client';

import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';

import { usePressedTab } from '../../../_discover/landing/LandingSwitch';
import SeenNote from '../../../_discover/landing/SeenNote';
import type { Script, TitleCard } from '../_data/language';
import TitleWallCard from './TitleCard';
import { SCRIPT_SWITCH, WALL_ID } from './wallIds';

type Props = Readonly<{
  cards: ReadonlyArray<TitleCard>;
  lang: string;
  /** "More in Japanese" */
  title: string;
}>;

const SCRIPTS: ReadonlySet<string> = new Set([
  'english',
  'native',
  'romanized',
]);

const isScript = (value: string | undefined): value is Script =>
  value !== undefined && SCRIPTS.has(value);

/**
 * The title wall ("More in Japanese"): four columns of title
 * cards on desktop, two on a phone, every title in the script the hero's
 * switch has pressed (the first, the original, until then).
 */
export default function TitleWall({ cards, lang, title }: Props) {
  const pressed = usePressedTab(SCRIPT_SWITCH);
  const script: Script = isScript(pressed) ? pressed : 'native';
  const ids = cards.map((card) => card.id);
  return (
    <section
      aria-labelledby="wall-title"
      className={PAGE_COLUMN}
      data-slot="wall"
    >
      <div className="mb-6 flex min-h-8 items-center gap-5">
        <h2 className="text-title-2 text-white" id="wall-title">
          {title}
        </h2>
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-white/60 max-md:hidden">
          <SeenNote ids={ids} />
        </span>
      </div>
      <ul
        className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
        id={WALL_ID}
      >
        {cards.map((card) => (
          <TitleWallCard
            card={card}
            key={card.id}
            lang={lang}
            script={script}
          />
        ))}
      </ul>
    </section>
  );
}
