import {
  calendarGlyph,
  clockGlyph,
  eyeGlyph,
  networkGlyph,
  premiereGlyph,
  seasonGlyph,
  starGlyph,
  tagGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';

import Section from './Section';
import { Specimen } from './Specimen';

const SEASONS = [
  ['Season 1', '2022', '8 episodes'],
  ['Season 2', '2023', '10 episodes'],
  ['Season 3', '2024', '10 episodes'],
] as const;

export default function MetaSection() {
  return (
    <Section
      id="meta"
      source="HMFinal hx-mrow, EPShowFinal ep-mrow, TYFinal t-mrow (V54)"
      title="Meta row"
    >
      <Specimen
        board="HMFinal spotlight, DSLSystem · Meta line"
        label="Show facts"
      >
        <MetaRow>
          <MetaItem icon={calendarGlyph}>2022</MetaItem>
          <MetaItem icon={seasonGlyph}>2 seasons</MetaItem>
          <MetaItem icon={tagGlyph}>Drama</MetaItem>
        </MetaRow>
      </Specimen>
      <Specimen
        board="EPShowFinal season facts (highlight, pink) and HMFinal premieres"
        label="Tones · highlight, pink, cyan"
      >
        <MetaRow>
          <MetaItem active icon={eyeGlyph} tone="highlight">
            4 of 10 watched
          </MetaItem>
          <MetaItem icon={clockGlyph}>3h 46m left</MetaItem>
          <MetaItem icon={premiereGlyph} tone="pink">
            Next E07 Fri
          </MetaItem>
          <MetaItem icon={starGlyph} tone="cyan">
            Up next
          </MetaItem>
        </MetaRow>
      </Specimen>
      <Specimen
        board="Typography rule 7: one line, ellipsis, full text on hover"
        label="Truncation · 280px wide, genres shrink first"
      >
        <div className="w-70 rounded-8 p-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
          <MetaRow>
            <MetaItem icon={calendarGlyph}>2014</MetaItem>
            <MetaItem icon={networkGlyph}>BBC Two</MetaItem>
            <MetaItem icon={tagGlyph} shrink>
              Drama, Comedy, Crime, Mystery
            </MetaItem>
          </MetaRow>
        </div>
      </Specimen>
      <Specimen
        board="EPShowFinal season rows (ssp-r .sb, tabular)"
        label="Stacked rows · tabular figures"
      >
        <div className="grid gap-2">
          {SEASONS.map(([season, year, episodes]) => (
            <MetaRow key={season} numbers="tabular">
              <MetaItem icon={seasonGlyph} tone="highlight">
                {season}
              </MetaItem>
              <MetaItem icon={calendarGlyph}>{year}</MetaItem>
              <MetaItem icon={seasonGlyph}>{episodes}</MetaItem>
            </MetaRow>
          ))}
        </div>
      </Specimen>
    </Section>
  );
}
