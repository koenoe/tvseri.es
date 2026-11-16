import type { Feature } from '@tvseri.es/schemas';
import { PAGE_COLUMN } from '../../frame';
import { MomentFrame } from '../Moment';
import FactDeck from './FactDeck';
import FactSlide from './FactSlide';
import { deckCopy } from './facts';

type DidYouKnowFeature = Extract<Feature, Readonly<{ kind: 'did-you-know' }>>;

/** "Did you know" (HMFinal `e2-dk`): up to four facts, one at a time */
export default function DidYouKnow({
  feature,
}: Readonly<{ feature: DidYouKnowFeature }>) {
  const copy = deckCopy(feature.facts);
  const sentences = copy.map((one) => one.text);
  const slides = feature.facts.map((fact, index) => (
    <FactSlide copy={copy[index]!} fact={fact} key={fact.series.id} />
  ));
  return (
    <MomentFrame name="feature">
      <div className={PAGE_COLUMN}>
        <FactDeck sentences={sentences} slides={slides} />
      </div>
    </MomentFrame>
  );
}
