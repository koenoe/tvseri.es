'use client';

import { SectionError } from '@/app/(site)/settings/_components/SectionErrorBoundary';
import BlockUnavailable from '@/app/(site)/u/[username]/(profile)/_components/blocks/BlockUnavailable';
import SectionUnavailable from '@/components/ui/row/SectionUnavailable';

import Section from './Section';
import { Specimen } from './Specimen';

const retry = () => {};

/**
 * The three "didn't load" looks, each where it lives: a row's card (Home,
 * Discover, the show page), the profile's centred block card, and a Settings
 * section's card. Try again only refreshes here.
 */
export default function UnavailableSection() {
  return (
    <Section
      id="unavailable"
      source="ERFinal (part 3, a section that didn't load), V60, SETFinal"
      title="Didn’t load"
    >
      <Specimen
        board="SectionUnavailable (a row)"
        className="block"
        label="A row on Home or Discover"
      >
        <SectionUnavailable id="sg-row-down" title="Top Picks for November" />
      </Specimen>
      <Specimen
        board="BlockUnavailable (profile blocks)"
        className="block max-w-80"
        label="A profile block, centred in its card"
      >
        <BlockUnavailable
          className="h-[160px] rounded-16"
          line="The rest of the page is fine."
          title="2026 so far isn’t available."
        />
      </Specimen>
      <Specimen
        board="SectionError (SectionErrorBoundary)"
        className="block max-w-180"
        label="A Settings section"
      >
        <SectionError
          placeholder={<div className="h-40" />}
          retry={retry}
          what="Your services"
        />
      </Specimen>
    </Section>
  );
}
