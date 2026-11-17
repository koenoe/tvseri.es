import { isIfYouLikedDay } from '@tvseri.es/utils';

import GuardedSection from '@/components/ui/row/GuardedSection';

import { getFeatureSlot, getToySlot } from './data/home';
import { ToyOrIfYouLiked } from './Personal';
import { FeatureSection, SECTION_TITLE, ToySection } from './Sections';
import { FeatureSkeleton, ToySkeleton } from './Skeletons';

type DayProps = Readonly<{ day: string }>;

/**
 * The day's two rotating slots. Each placeholder takes the size of what the
 * slot really draws (`getFeatureSlot`, `getToySlot`: the section's own
 * cached read), also when the planned kind fell through; the section fails
 * over the same node, so a failure moves nothing. Each slot waits for its
 * own read only: the rest of the page renders meanwhile.
 */
export async function FeatureSlot({ day }: DayProps) {
  const slot = await getFeatureSlot(day);
  const placeholder = <FeatureSkeleton count={slot.count} kind={slot.kind} />;
  return (
    <GuardedSection
      fallback={placeholder}
      id="feature"
      placeholder={placeholder}
      title={SECTION_TITLE.feature}
    >
      <FeatureSection day={day} placeholder={placeholder} />
    </GuardedSection>
  );
}

/** The toy slot; signed in, "If you liked X" takes it on its days */
export async function ToySlot({ day }: DayProps) {
  const kind = await getToySlot(day);
  const ifYouLiked = isIfYouLikedDay(day);
  const placeholder = <ToySkeleton ifYouLiked={ifYouLiked} kind={kind} />;
  const toy = ifYouLiked ? (
    <ToyOrIfYouLiked day={day} placeholder={placeholder} />
  ) : (
    <ToySection day={day} placeholder={placeholder} />
  );
  return (
    <GuardedSection
      fallback={placeholder}
      id="toy"
      placeholder={placeholder}
      title={SECTION_TITLE.toy}
    >
      {toy}
    </GuardedSection>
  );
}
