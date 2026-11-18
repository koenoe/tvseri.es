import HeadLink from '@/app/(site)/u/[username]/(profile)/_components/blocks/HeadLink';
import ClampedText, { type ClampFit } from '@/components/ui/fold/ClampedText';
import FoldLabel from '@/components/ui/fold/FoldLabel';
import Dot from '@/components/ui/lane/Dot';
import SectionHead from '@/components/ui/section/SectionHead';

import Section from './Section';
import { Specimen, State } from './Specimen';

/** A fold button's frame (the caller's: here the person page's) */
const FOLD =
  'flex h-12 w-80 items-center justify-center gap-2 rounded-12 bg-white/5 px-4 text-body-sm font-medium';

const CLAMP_FIT: ClampFit = { base: 120 };
const CLAMP_TEXT = 'text-body text-white/80';
const LONG_TEXT =
  'A made-up biography long enough for the clamp: born in a harbour town, trained as a carpenter, then twenty years of stage work before a first television role at forty. Since then a run of character parts in crime dramas, two long-running comedies and a documentary series about boatbuilding.';
const SHORT_TEXT = 'A made-up biography that three lines hold.';

const DOT = <Dot tone="cyan" />;
const LINK = <HeadLink href="#headings">Stats</HeadLink>;

/**
 * The shared section heading (`SectionHead`), the fold's label (`FoldLabel`)
 * and three-line text with More (`ClampedText`).
 */
export default function HeadingSection() {
  return (
    <Section
      id="headings"
      source="the section headings across pages"
      title="Section heading and fold"
    >
      <Specimen
        className="flex-col items-stretch gap-6"
        label="Heading with a rule"
        note="SectionHead"
      >
        <State name="title only">
          <div className="w-full max-w-180">
            <SectionHead id="sg-head-plain" title="Information" />
          </div>
        </State>
        <State name="with a count (the person page's Series)">
          <div className="w-full max-w-180">
            <SectionHead count={67} id="sg-head-count" title="Series" />
          </div>
        </State>
        <State name="with the block dot and a link (the profile)">
          <div className="w-full max-w-180">
            <SectionHead
              id="sg-head-dot"
              leading={DOT}
              link={LINK}
              title="Up next"
            />
          </div>
        </State>
        <State name="side size (sidebars)">
          <div className="w-full max-w-80">
            <SectionHead id="sg-head-side" size="side" title="2026 so far" />
          </div>
        </State>
      </Specimen>
      <Specimen label="Fold" note="FoldLabel (one label cell, both states)">
        <State name="folded">
          <button aria-expanded={false} className={FOLD} type="button">
            <FoldLabel label="Show all 67 series" open={false} size={15} />
          </button>
        </State>
        <State name="open">
          <button aria-expanded className={FOLD} type="button">
            <FoldLabel label="Show all 67 series" open size={15} />
          </button>
        </State>
      </Specimen>
      <Specimen
        label="Clamped text"
        note="ClampedText (the show hero's synopsis, the person page's biography)"
      >
        <State name="cut: More">
          <div className="w-80">
            <ClampedText
              fit={CLAMP_FIT}
              text={LONG_TEXT}
              textClassName={CLAMP_TEXT}
            />
          </div>
        </State>
        <State name="fits: no toggle">
          <div className="w-80">
            <ClampedText
              fit={CLAMP_FIT}
              text={SHORT_TEXT}
              textClassName={CLAMP_TEXT}
            />
          </div>
        </State>
      </Specimen>
    </Section>
  );
}
