import {
  didNotLoad,
  REST_IS_FINE,
} from '@/components/ui/error/unavailableCopy';
import { UP_NEXT_SIZE } from '@/components/up-next/upNextLayout';
import cn from '@/lib/cn';

import BlockUnavailable from '../../blocks/BlockUnavailable';

const BOX = cn('justify-center rounded-12', UP_NEXT_SIZE);
const TITLE = didNotLoad('Popular this week');

/**
 * The borrowed pick can't load: the unavailable block at the card's exact
 * size, so nothing shifts when it comes back.
 */
export default function PickUnavailable() {
  return <BlockUnavailable className={BOX} line={REST_IS_FINE} title={TITLE} />;
}
