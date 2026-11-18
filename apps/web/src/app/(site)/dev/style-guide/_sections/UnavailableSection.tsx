'use client';

import { SectionError } from '@/app/(site)/settings/_components/SectionErrorBoundary';
import BlockUnavailable from '@/app/(site)/u/[username]/(profile)/_components/blocks/BlockUnavailable';
import RowError from '@/components/ui/row/RowError';

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
      source="a section that didn't load"
      title="Didn’t load"
    >
      <Specimen
        className="block"
        label="A row on Home or Discover"
        note="RowError (state unavailable)"
      >
        <RowError
          id="sg-row-down"
          state="unavailable"
          title="Top Picks for November"
        />
      </Specimen>
      <Specimen
        className="block max-w-80"
        label="A profile block, centred in its card"
        note="BlockUnavailable (profile blocks)"
      >
        <BlockUnavailable
          className="h-[160px] rounded-16"
          line="The rest of the page is fine."
          title="2026 so far isn’t available."
        />
      </Specimen>
      <Specimen
        className="block max-w-180"
        label="A Settings section"
        note="SectionError (SectionErrorBoundary)"
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
