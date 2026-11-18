import { IF_YOU_LIKED, TOYS } from '../../../../../../e2e/fixtures/home/toy.ts';
import { ToySkeleton } from '../../../_home/Skeletons';
import IfYouLiked from '../../../_home/toy/IfYouLiked';
import IfYouLikedGhost from '../../../_home/toy/if-you-liked/IfYouLikedGhost';
import Toy from '../../../_home/toy/Toy';

/** Each toy of the day through the dispatcher, in its own `id` */
const KINDS = ['whats-on', 'where-set', 'connected-by', 'versus'] as const;

/**
 * The toy of the day, every kind with the sample data (Mon 9 What's on,
 * Tue 10 Where are they set?, Wed 11 Connected by, Thu 12 Versus), then the signed-in
 * If you liked The Bear (signed in, Tue 10), then each kind's placeholder:
 * on Home it only shows when the API is slow, so its boxes are compared
 * with the loaded toy's here (`e2e/placeholders-home.spec.ts`).
 */
export default function ToyPreview() {
  return (
    <>
      {KINDS.map((kind) => {
        const toy = TOYS[kind];
        const anchor = `toy-${kind}`;
        return toy ? (
          <div id={anchor} key={kind}>
            <Toy toy={toy} />
          </div>
        ) : null;
      })}
      <div id="toy-if-you-liked">
        <IfYouLiked data={IF_YOU_LIKED} />
      </div>
      {KINDS.map((kind) => {
        const anchor = `toy-ghost-${kind}`;
        return (
          <div id={anchor} key={kind}>
            <ToySkeleton ifYouLiked={false} kind={kind} />
          </div>
        );
      })}
      <div id="toy-ghost-if-you-liked">
        <IfYouLikedGhost />
      </div>
    </>
  );
}
