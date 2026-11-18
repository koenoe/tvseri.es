import { FEATURE_KINDS, TOY_KINDS } from '@tvseri.es/utils';
import { Suspense } from 'react';
import Feature from '../../../_home/feature/Feature';
import { FeatureSkeleton, ToySkeleton } from '../../../_home/Skeletons';
import IfYouLiked from '../../../_home/toy/IfYouLiked';
import Toy from '../../../_home/toy/Toy';
import KindBlock from './KindBlock';
import { nextDay } from './plan';
import {
  countdown,
  countdownOfThree,
  featureOfKind,
  ifYouLiked,
  slotOn,
  toyOfKind,
} from './realData';

type Props = Readonly<{ today: string }>;

async function RealFeature({
  kind,
  today,
}: Props & Readonly<{ kind: (typeof FEATURE_KINDS)[number] }>) {
  const next = nextDay(today, (plan) => plan.feature === kind);
  const [asked, onNext] = await Promise.all([
    featureOfKind(kind, today),
    next ? slotOn('feature', next) : null,
  ]);
  return (
    <KindBlock
      id={`kind-${kind}`}
      kind={kind}
      next={next}
      note={asked.note}
      onNext={onNext}
      today={today}
    >
      {asked.value ? <Feature feature={asked.value} today={today} /> : null}
    </KindBlock>
  );
}

async function RealCountdown({ today }: Props) {
  const asked = await countdown(today);
  return (
    <KindBlock
      id="kind-countdown"
      kind="countdown"
      next={asked.dueOn ?? null}
      note={asked.note}
      today={today}
    >
      {asked.value ? <Feature feature={asked.value} /> : null}
    </KindBlock>
  );
}

async function RealCountdownOfThree({ today }: Props) {
  const asked = await countdownOfThree(today);
  return (
    <KindBlock
      id="kind-countdown-three"
      kind="countdown, three premieres (preview)"
      next={null}
      note={asked.note}
      today={today}
    >
      {asked.value ? <Feature feature={asked.value} /> : null}
    </KindBlock>
  );
}

async function RealToy({
  kind,
  today,
}: Props & Readonly<{ kind: (typeof TOY_KINDS)[number] }>) {
  const next = nextDay(today, (plan) => plan.toy === kind);
  const [asked, onNext] = await Promise.all([
    toyOfKind(kind, today),
    next ? slotOn('toy', next) : null,
  ]);
  return (
    <KindBlock
      id={`kind-${kind}`}
      kind={kind}
      next={next}
      note={asked.note}
      onNext={onNext}
      today={today}
    >
      {asked.value ? <Toy toy={asked.value} /> : null}
    </KindBlock>
  );
}

async function RealIfYouLiked({ today }: Props) {
  const asked = await ifYouLiked(today);
  return (
    <KindBlock
      id="kind-if-you-liked"
      kind="if-you-liked (signed in, toy slot)"
      next={nextDay(today, (plan) => plan.ifYouLiked)}
      note={asked.note}
      today={today}
    >
      {asked.value ? <IfYouLiked data={asked.value} /> : null}
    </KindBlock>
  );
}

/**
 * Every rotating kind with the API's real data for today (`?kind=`), each
 * streamed on its own behind the placeholder Home uses for it, labelled with
 * when it next appears and what the API does on that day.
 */
export default function RealKinds({ today }: Props) {
  return (
    <>
      {FEATURE_KINDS.map((kind) => (
        <Suspense fallback={<FeatureSkeleton kind={kind} />} key={kind}>
          <RealFeature kind={kind} today={today} />
        </Suspense>
      ))}
      <Suspense fallback={<FeatureSkeleton kind="countdown" />}>
        <RealCountdown today={today} />
      </Suspense>
      <Suspense fallback={<FeatureSkeleton kind="countdown" />}>
        <RealCountdownOfThree today={today} />
      </Suspense>
      {TOY_KINDS.map((kind) => (
        <Suspense
          fallback={<ToySkeleton ifYouLiked={false} kind={kind} />}
          key={kind}
        >
          <RealToy kind={kind} today={today} />
        </Suspense>
      ))}
      <Suspense fallback={null}>
        <RealIfYouLiked today={today} />
      </Suspense>
    </>
  );
}
