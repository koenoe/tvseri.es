'use client';

import { type ReactNode, useState } from 'react';

import Button from '@/components/ui/button/Button';
import { infoGlyph, shuffleGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';

import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';
import {
  ANOTHER_LABEL,
  DECK,
  DECK_CONTROLS,
  DECK_LABEL,
  DECK_LABEL_ID,
  PIP,
  PIPS,
} from './layout';

/**
 * Did you know's deck, its label top left: the
 * facts stacked in one place, one shown, cross-fading (opacity, 0.5s) to the next on "Another";
 * the pips say which. Hidden facts are inert (out of the tab order). The
 * slides are rendered on the server; this island only holds the index.
 */
export default function FactDeck({
  sentences,
  slides,
}: Readonly<{
  /** Each slide's sentence, said aloud when "Another" brings it in */
  sentences: ReadonlyArray<string>;
  slides: ReadonlyArray<ReactNode>;
}>) {
  const [shown, setShown] = useState(0);
  // Empty until "Another": the first fact is read with the page, not twice
  const [announced, setAnnounced] = useState('');
  const next = () => {
    const index = (shown + 1) % slides.length;
    setShown(index);
    setAnnounced(sentences[index] ?? '');
  };
  return (
    <section aria-labelledby={DECK_LABEL_ID} className={DECK}>
      <MomentLabel
        className={DECK_LABEL}
        glyph={infoGlyph}
        id={DECK_LABEL_ID}
        title={FEATURE_TITLE['did-you-know']}
      />
      {/* A region that is always there: one that appears with its text is
          not reliably announced */}
      <p aria-live="polite" className="sr-only">
        {announced}
      </p>
      {slides.map((slide, index) => {
        const on = index === shown;
        const off = !on;
        const layer = cn(
          '[grid-area:1/1] transition-opacity duration-500 ease-[ease]',
          on ? 'opacity-100' : 'opacity-0',
        );
        return (
          <div aria-hidden={off} className={layer} inert={off} key={index}>
            {slide}
          </div>
        );
      })}
      {slides.length > 1 ? (
        <div className={DECK_CONTROLS}>
          <span aria-hidden className={PIPS}>
            {slides.map((_, index) => {
              const pip = cn(
                PIP,
                'transition-opacity duration-500',
                index === shown ? 'opacity-100' : 'opacity-35',
              );
              return <i className={pip} key={index} />;
            })}
          </span>
          <Button icon={shuffleGlyph} onClick={next}>
            {ANOTHER_LABEL}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
