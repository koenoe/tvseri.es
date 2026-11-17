import { FIXTURE_TODAY } from '../../../../../../e2e/fixtures/home/base.ts';
import { FEATURES } from '../../../../../../e2e/fixtures/home/feature.ts';
import Feature from '../../../_home/feature/Feature';
import { FeatureSkeleton } from '../../../_home/Skeletons';

/** Each feature of the day through the dispatcher, in its own `id` */
const KINDS = [
  'binge',
  'stills',
  'archive',
  'did-you-know',
  'countdown',
] as const;

/** The kinds whose placeholder is compared with the loaded card here */
const GHOST_KINDS = [
  'binge',
  'stills',
  'archive',
  'did-you-know',
  'countdown',
] as const;

/** What the day draws: the stills the fixture has, else the Countdown's three premieres */
const ghostCount = (kind: (typeof GHOST_KINDS)[number]) => {
  const feature = FEATURES[kind];
  return feature?.kind === 'stills' ? feature.stills.length : 3;
};

/**
 * The feature of the day, every kind with the sample data (Mon 9 binge,
 * Tue 10 stills, Wed 11 archive, Did you know, Sat 14 countdown). The Binge
 * calculator plans from the sample today (Wed 11 Nov) so its strip matches.
 * Then the placeholders of the kinds that carry their label inside or keep
 * room for their longest text: on Home they only show when the API is slow,
 * so their boxes are compared with the loaded card's here
 * (`e2e/placeholders-home.spec.ts`).
 */
export default function FeaturePreview() {
  return (
    <>
      {KINDS.map((kind) => {
        const feature = FEATURES[kind];
        return feature ? (
          <div id={`feature-${kind}`} key={kind}>
            <Feature feature={feature} today={FIXTURE_TODAY} />
          </div>
        ) : null;
      })}
      {GHOST_KINDS.map((kind) => (
        <div id={`feature-ghost-${kind}`} key={kind}>
          <FeatureSkeleton count={ghostCount(kind)} kind={kind} />
        </div>
      ))}
    </>
  );
}
