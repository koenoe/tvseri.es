import type { Feature } from '@tvseri.es/schemas';
import { PAGE_COLUMN } from '../../frame';
import { MomentFrame } from '../Moment';
import BingeCalculator from './BingeCalculator';
import { bingeChoices } from './choices';

type BingeFeature = Extract<Feature, Readonly<{ kind: 'binge' }>>;

/**
 * The server side of the Binge calculator: only what the island needs. No
 * title row: the card carries its label
 */
export default function Binge({
  feature,
  today,
}: Readonly<{ feature: BingeFeature; today?: string }>) {
  const choices = bingeChoices(feature);
  return choices.length > 0 ? (
    <MomentFrame name="feature">
      <div className={PAGE_COLUMN}>
        <BingeCalculator choices={choices} today={today} />
      </div>
    </MomentFrame>
  ) : null;
}
