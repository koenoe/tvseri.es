import type { Feature as FeatureData } from '@tvseri.es/schemas';

import Countdown from '../premieres/Countdown';
import FromTheArchive from './archive/FromTheArchive';
import Binge from './binge/Binge';
import DidYouKnow from './didYouKnow/DidYouKnow';
import SeasonInStills from './stills/SeasonInStills';

/**
 * The feature of the day after Hidden gems: the
 * Binge calculator, Season in stills, From the archive or Did you know, or
 * the Countdown when the next big premiere is 3 days away or less. None has
 * a title above it: each is headed by its label (`MomentLabel`), inside its
 * card or as its first line.
 */
export default function Feature({
  feature,
  today,
}: Readonly<{
  feature: FeatureData;
  /** A fixed `YYYY-MM-DD` for the Binge calculator (dev preview only) */
  today?: string;
}>) {
  switch (feature.kind) {
    case 'binge':
      return <Binge feature={feature} today={today} />;
    case 'stills':
      return <SeasonInStills feature={feature} />;
    case 'archive':
      return <FromTheArchive feature={feature} />;
    case 'did-you-know':
      return feature.facts.length > 0 ? <DidYouKnow feature={feature} /> : null;
    case 'countdown':
      return <Countdown premieres={feature.premieres} />;
  }
}
