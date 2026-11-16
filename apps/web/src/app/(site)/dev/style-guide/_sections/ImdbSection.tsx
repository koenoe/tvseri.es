import {
  RatedBadge,
  UnratedBadge,
} from '@/app/(site)/[id]/[[...slug]]/_components/hero/ImdbRating';

import Section from './Section';
import { OnStill, Specimen, State } from './Specimen';

/** The show page's IMDb badge, rated and unrated (phone sizes below 768px). */
export default function ImdbSection() {
  return (
    <Section id="imdb" source="the IMDb rating badge" title="IMDb badge">
      <Specimen label="On a hero" note="ImdbRating: RatedBadge, UnratedBadge">
        <OnStill>
          <State name="rated">
            <RatedBadge imdbId="tt14452776" value={8.5} votes={330_000} />
          </State>
          <State name="rated, no votes">
            <RatedBadge imdbId="tt14452776" value={7.9} votes={0} />
          </State>
          <State name="unrated (still a link to IMDb)">
            <UnratedBadge imdbId="tt14452776" />
          </State>
        </OnStill>
      </Specimen>
    </Section>
  );
}
