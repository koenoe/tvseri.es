import { completeGlyph } from '@/components/ui/icon/glyphs';
import UpNextBar from '@/components/up-next/UpNextBar';
import UpNextCaption from '@/components/up-next/UpNextCaption';
import UpNextCard from '@/components/up-next/UpNextCard';
import UpNextFacts from '@/components/up-next/UpNextFacts';
import showPath from '@/lib/routing/showPath';

import type { HeroPick } from './loadUpNext';

const PILL = { glyph: completeGlyph, text: 'Nothing in progress' };

/** Empty Up next: a dimmed pick, "Nothing in progress", "Not started · 26 episodes" */
export default function PickHero({ pick }: Readonly<{ pick: HeroPick }>) {
  const episodes = `${pick.episodes} episodes`;
  const facts = <UpNextFacts facts={pick.facts} />;
  const href = showPath(pick.seriesId, pick.slug);
  const bar = (
    <UpNextBar code={pick.code} title={pick.episodeTitle}>
      <UpNextCaption
        className="md:ml-auto"
        lead="Not started"
        rest={episodes}
      />
    </UpNextBar>
  );
  return (
    <UpNextCard
      backdrop={pick.backdrop}
      backdropClassName="brightness-[0.6] saturate-[0.7]"
      bar={bar}
      facts={facts}
      href={href}
      label={pick.title}
      loading="eager"
      logo={pick.logo}
      pill={PILL}
      title={pick.title}
    />
  );
}
