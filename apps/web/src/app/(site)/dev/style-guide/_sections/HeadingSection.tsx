import Dot from '@/app/(site)/u/[username]/(profile)/_components/blocks/Dot';
import HeadLink from '@/app/(site)/u/[username]/(profile)/_components/blocks/HeadLink';
import FoldLabel from '@/components/ui/fold/FoldLabel';
import SectionHead from '@/components/ui/section/SectionHead';

import Section from './Section';
import { Specimen, State } from './Specimen';

/** A fold button's frame (the caller's: here the person page's) */
const FOLD =
  'flex h-12 w-80 items-center justify-center gap-2 rounded-12 bg-white/5 px-4 text-body-sm font-medium';

const DOT = <Dot tone="cyan" />;
const LINK = <HeadLink href="#headings">Stats</HeadLink>;

/** The shared section heading (`SectionHead`) and the fold's label (`FoldLabel`). */
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
    </Section>
  );
}
