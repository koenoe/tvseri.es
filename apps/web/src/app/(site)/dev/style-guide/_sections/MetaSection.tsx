import {
  calendarGlyph,
  clockGlyph,
  eyeGlyph,
  networkGlyph,
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
    <Section id="meta" source="the meta line" title="Meta row">
      <Specimen label="Show facts" note="Spotlight meta line">
        <MetaRow>
          <MetaItem icon={calendarGlyph}>2022</MetaItem>
          <MetaItem icon={seasonGlyph}>2 seasons</MetaItem>
          <MetaItem icon={tagGlyph}>Drama</MetaItem>
        </MetaRow>
      </Specimen>
      <Specimen
        label="Tones · highlight, pink, cyan"
        note="Season facts (highlight, pink) and premieres"
      >
        <MetaRow>
          <MetaItem active icon={eyeGlyph} tone="highlight">
            4 of 10 watched
          </MetaItem>
          <MetaItem icon={clockGlyph}>3h 46m left</MetaItem>
          <MetaItem icon={calendarGlyph} tone="pink">
            Next E07 Fri
          </MetaItem>
          <MetaItem icon={starGlyph} tone="cyan">
            Up next
          </MetaItem>
        </MetaRow>
      </Specimen>
      <Specimen
        label="Truncation · 280px wide, genres shrink first"
        note="One line, ellipsis, full text on hover"
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
        label="Stacked rows · tabular figures"
        note="Season rows (tabular)"
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
