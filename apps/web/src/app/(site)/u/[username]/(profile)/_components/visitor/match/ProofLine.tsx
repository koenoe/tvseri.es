import type { SharedShow, TasteMatchResponse } from '@tvseri.es/schemas';
import TileLink from '@/components/ui/tile/TileLink';

import showPath from '@/lib/routing/showPath';

import {
  NO_SHARED_LINE,
  PROOF_SHOWS,
  proofParts,
  separatorBefore,
} from './matchCopy';

const NAME =
  '-mx-[3px] rounded-[5px] px-[3px] py-px font-semibold text-white underline decoration-[rgb(var(--acr)/0.6)] decoration-2 underline-offset-[3px] transition-[background-color,color,box-shadow] hover:bg-[var(--ac)] hover:text-ground-deep hover:no-underline focus-visible:bg-[var(--ac)] focus-visible:text-ground-deep focus-visible:no-underline focus-visible:outline-hidden';

/**
 * Two lines, always: its ghost's (`MatchCardSkeleton`), so long titles never
 * make the card taller when it streams in. The rest is cut off until a name
 * in it takes the keyboard's focus.
 */
const PROOF =
  'm-0 line-clamp-2 min-h-[2lh] text-body-sm text-white/60 focus-within:line-clamp-none';

/**
 * "You both watch The Pitt, Severance and Dexter: Resurrection.": each name
 * links to the show; hovering one lights up that show elsewhere on the page
 * (`data-proof`, see `ProofHighlight`).
 */
export default function ProofLine({
  match,
}: Readonly<{ match: TasteMatchResponse['match'] }>) {
  const shown = match.sharedShows.slice(0, PROOF_SHOWS);
  if (shown.length === 0) {
    return <p className="m-0 text-body-sm text-white/60">{NO_SHARED_LINE}</p>;
  }
  const { after, before } = proofParts(match);
  return (
    <p className={PROOF}>
      {before}
      {shown.map((show, index) => (
        <ProofName
          index={index}
          key={show.id}
          show={show}
          total={shown.length}
        />
      ))}
      {after}
    </p>
  );
}

function ProofName({
  index,
  show,
  total,
}: Readonly<{ index: number; show: SharedShow; total: number }>) {
  const href = showPath(show.id, show.slug);
  return (
    <>
      {separatorBefore(index, total)}
      <TileLink className={NAME} data-proof={show.id} href={href}>
        {show.title}
      </TileLink>
    </>
  );
}
