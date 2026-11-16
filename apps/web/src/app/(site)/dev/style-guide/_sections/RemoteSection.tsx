'use client';

import { useState } from 'react';
import type { RemoteSection as ExtraSection } from '@/components/remote/types';
import { chipStyles } from '@/components/ui/button/buttonStyles';
import { externalGlyph, pencilGlyph } from '@/components/ui/icon/glyphs';

import { ShowFrame, setSlow, TileFrame } from './RemoteFrames';
import Section from './Section';
import { Specimen, State } from './Specimen';

const CHIP_PLAIN = chipStyles({});

const openHeroImages = () => {};

function Network() {
  const [slow, setSlowState] = useState(false);
  const pick = (value: boolean) => () => {
    setSlow(value);
    setSlowState(value);
  };
  return (
    <div className="flex gap-2">
      <button
        aria-pressed={!slow}
        className={CHIP_PLAIN}
        onClick={pick(false)}
        type="button"
      >
        Fast
      </button>
      <button
        aria-pressed={slow}
        className={CHIP_PLAIN}
        onClick={pick(true)}
        type="button"
      >
        Slow (900 ms)
      </button>
    </div>
  );
}

/** The Admin row through `extraSection` (the show page passes it for admins). */
const ADMIN: ExtraSection = {
  keys: [
    {
      icon: pencilGlyph,
      id: 'hero-images',
      label: 'Hero images',
      letter: 'I',
      onSelect: openHeroImages,
    },
    {
      external: true,
      href: 'https://www.themoviedb.org/tv/136315/images/backdrops',
      icon: externalGlyph,
      id: 'tmdb-images',
      label: 'Images on TMDB',
      letter: 'T',
    },
  ],
  note: 'Only you see these',
  title: 'Admin',
};

export default function RemoteSection() {
  return (
    <Section id="remote" source="the Remote" title="Remote">
      <p className="text-body-sm text-white/60">
        Click ⋯ (or Enter on it), a key, a letter, the arrows, Esc. Fakes, not
        the marking core: marks and lists live in memory. Narrow the window
        below 768px for the phone sheet. Slow shows the pending rings.
      </p>
      <Specimen label="Network" note="Demo controls">
        <Network />
      </Specimen>
      <Specimen
        className="items-start gap-8"
        label="Show page"
        note="Frames 1–4 (672 × 460, The Bear #29251f, Severance #1d2a33)"
      >
        <State name="1 · Open (E05 next, nothing latched)">
          <ShowFrame fake="open" name="open" />
        </State>
        <State name="2 · After N, then F (E06 next, favourites latched)">
          <ShowFrame fake="after" name="after" />
        </State>
        <State name="3 · Finished (Severance: disabled with its reason)">
          <ShowFrame
            fake="finished"
            ink="#1d2a33"
            name="finished"
            seriesName="Severance"
          />
        </State>
        <State name="4 · Keyboard (Enter on ⋯, → to F; watchlist latched)">
          <ShowFrame fake="keyboard" name="keyboard" />
        </State>
      </Specimen>
      <Specimen
        className="items-start gap-8"
        label="In progress tile"
        note="Frame 5 (448 × 440 tile)"
      >
        <State name="5 · N, E and H">
          <TileFrame name="tile" />
        </State>
        <State name="Admin row (extraSection)">
          <ShowFrame extraSection={ADMIN} fake="phone" name="admin" />
        </State>
      </Specimen>
    </Section>
  );
}
