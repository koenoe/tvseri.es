import {
  BECAUSE_YOU_WATCHED,
  DEXTER_RESURRECTION,
  GET_STARTED_NEW,
  GET_STARTED_PARTLY,
  MORE_GENRE,
  upNext,
} from '../../../../../../e2e/fixtures/home/personal.ts';
import BecauseYouWatchedRow from '../../../_home/personal/BecauseYouWatchedRow';
import ContinueWatching from '../../../_home/personal/ContinueWatching';
import GetStarted from '../../../_home/personal/GetStarted';
import MoreGenreRow from '../../../_home/personal/MoreGenreRow';

/** The sample clock: Wed 11 Nov 2026, midday UTC */
const NOW = Date.UTC(2026, 10, 11, 12);
const USERNAME = 'nina';

const ITEMS = upNext(NOW);

/**
 * The signed-in touches with the sample
 * data: Continue watching, Get started (0 of 3, partly done, all set),
 * Because you watched and More {genre}, each in its own `id`.
 */
export default function PersonalPreview() {
  return (
    <>
      <div id="personal-continue-watching">
        <ContinueWatching
          first={DEXTER_RESURRECTION}
          items={ITEMS}
          now={NOW}
          username={USERNAME}
        />
      </div>
      <div id="personal-get-started-new">
        <GetStarted status={GET_STARTED_NEW} username={USERNAME} />
      </div>
      <div id="personal-get-started-partly">
        <GetStarted status={GET_STARTED_PARTLY} username={USERNAME} />
      </div>
      <div id="personal-because-you-watched">
        <BecauseYouWatchedRow data={BECAUSE_YOU_WATCHED} />
      </div>
      <div id="personal-more-genre">
        <MoreGenreRow data={MORE_GENRE} />
      </div>
    </>
  );
}
