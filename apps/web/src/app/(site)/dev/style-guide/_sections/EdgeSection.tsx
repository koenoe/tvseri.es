import type { CSSProperties } from 'react';

import Dot from '@/app/(site)/u/[username]/(profile)/_components/blocks/Dot';
import { heroShade } from '@/components/background/heroShade';
import SectionHead from '@/components/ui/section/SectionHead';

import Section from './Section';
import { Specimen, State } from './Specimen';

/** Artwork stand-ins: a bright still and a dark one, under each one's page colour */
const ARTWORK = {
  bright: {
    art: 'linear-gradient(120deg, #f4e7cf 0%, #d9b98c 45%, #8f6a45 100%)',
    color: '#5a4430',
  },
  dark: {
    art: 'linear-gradient(120deg, #3c4a52 0%, #1b2329 60%, #0c1013 100%)',
    color: '#1c2223',
  },
} as const;

const shaded = ({ art, color }: Readonly<{ art: string; color: string }>) =>
  ({ background: `${heroShade(color)}, ${art}` }) satisfies CSSProperties;

const HERO =
  'flex h-48 w-80 items-end rounded-12 p-5 text-title-2 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]';

/** Text steps over the page: informative text never goes below 60% */
const STEPS = [
  ['text-white', 'titles, values'],
  ['text-white/80', 'body, links, actions'],
  ['text-white/60', 'meta, captions: the floor for informative text'],
] as const;

const DOT = <Dot tone="white" />;

/** The hero shade, the page gutter and its left edge, the contrast floor. */
export default function EdgeSection() {
  const bright = shaded(ARTWORK.bright);
  const dark = shaded(ARTWORK.dark);
  return (
    <Section
      id="edges"
      source="the header read (gutter, contrast)"
      title="Shade, gutter and contrast"
    >
      <Specimen label="Hero shade" note="heroShade(color) over the artwork">
        <State name="bright backdrop">
          <div className={HERO} style={bright}>
            The Studio
          </div>
        </State>
        <State name="dark backdrop">
          <div className={HERO} style={dark}>
            Severance
          </div>
        </State>
      </Specimen>
      <Specimen
        className="block"
        label="The gutter and the left edge"
        note="--gutter: 32px (globals.css); px-gutter"
      >
        <div className="-mx-gutter border-white/20 border-y border-dashed">
          <div className="relative px-gutter py-4">
            {/* the gutter's edge: what every heading, row and card starts on */}
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-gutter border-cyan border-l"
            />
            <SectionHead id="sg-edge-dot" leading={DOT} title="Up next" />
            <div className="mt-4 h-16 w-60 rounded-12 bg-white/6" />
          </div>
        </div>
        <p className="mt-3 text-meta text-white/60">
          One left edge per page: a heading’s first mark (its dot when it opens
          with one) and the first card sit on the gutter; nothing hangs left of
          it.
        </p>
      </Specimen>
      <Specimen label="Contrast floor" note="lib/a11y/textContrast.test.ts">
        {STEPS.map(([step, use]) => (
          <State key={step} name={step}>
            <span className={`text-body-sm ${step}`}>{use}</span>
          </State>
        ))}
        <State name="white/40: decorative only, marked contrast-exempt">
          {/* contrast-exempt: the style guide's sample of the step */}
          <span className="text-body-sm text-white/40">
            an icon, a disabled state
          </span>
        </State>
      </Specimen>
    </Section>
  );
}
