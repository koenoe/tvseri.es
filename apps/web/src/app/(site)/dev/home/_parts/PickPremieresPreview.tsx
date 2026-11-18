import { FIXTURE_TODAY } from '../../../../../../e2e/fixtures/home/base.ts';
import {
  COUNTDOWN_PREMIERES,
  PICK_DECK,
  PREMIERES,
} from '../../../../../../e2e/fixtures/home/premieres.ts';
import PickGhost from '../../../_home/pick/PickGhost';
import PickOneForMe from '../../../_home/pick/PickOneForMe';
import Countdown from '../../../_home/premieres/Countdown';
import PremieresRow, {
  PremieresSkeleton,
} from '../../../_home/premieres/PremieresRow';

/**
 * Pick one for me (at rest, Wed 11) and its placeholder, the Premieres row
 * and its placeholder, and the Countdown (Sat 14) with the sample data, each in its own `id`.
 * A ticket's Watchlist pill is pressed when the viewer's library has the
 * series: sign in (or answer `/api/me/library-ids` in the screenshot
 * script) to see it.
 */
export default function PickPremieresPreview() {
  return (
    <>
      <div id="pick-rest">
        <PickOneForMe day={FIXTURE_TODAY} pool={PICK_DECK} />
      </div>
      <div id="pick-ghost">
        <PickGhost />
      </div>
      <div id="premieres">
        <PremieresRow premieres={PREMIERES.items} />
      </div>
      <div id="premieres-ghost">
        <PremieresSkeleton />
      </div>
      <div id="countdown">
        <Countdown premieres={COUNTDOWN_PREMIERES} />
      </div>
    </>
  );
}
