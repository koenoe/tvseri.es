import type { CSSProperties } from 'react';

import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import type { Profile } from '../../_data/profile';
import MatchRing from '../blocks/MatchRing';
import { MATCH_CARD_RING } from '../blocks/matchRingLooks';
import { loadMatch } from './loadMatch';
import { levelStyle } from './match/levels';
import { levelLine, ringLabel } from './match/matchCopy';
import NewToYouPicks from './match/NewToYouPicks';
import ProofHighlight from './match/ProofHighlight';
import ProofLine from './match/ProofLine';

/** The card's panel (its ghost takes the same) */
const MATCH_CARD =
  'relative flex flex-col gap-5 overflow-hidden rounded-16 bg-black/22 px-5 pt-[22px] pb-5';

/**
 * The match card: the ring with the shared count, the level word in its
 * colour, the proof you can point at, then New to you from them. No level
 * under five shared shows: an empty ring and a plain line.
 */
export default async function MatchCard({
  profile,
}: Readonly<{ profile: Profile }>) {
  const { match, newToYou } = await loadMatch(profile);
  const { username } = profile.user;
  const hasLevel = match.level !== null && !match.notEnough;
  const style = levelStyle(hasLevel ? match.level : null);
  const tint: CSSProperties = {
    backgroundImage: `radial-gradient(90% 60% at 18% 0%, rgb(${style.rgb} / ${style.tint}), transparent 70%)`,
  };
  const vars = {
    '--ac': style.hex,
    '--acr': style.rgb,
    boxShadow:
      hasLevel && match.level === 'super'
        ? `0 0 36px -14px rgb(${style.rgb} / .5)`
        : undefined,
  } as CSSProperties;
  const levelWord = { color: style.hex };
  const line = levelLine(username, hasLevel);
  const ringLevel = hasLevel ? match.level : null;
  const ring = ringLabel(ringLevel, match.sharedCount);
  const sectionLabel = `Your match with ${username}`;
  const proofShows = match.sharedShows.slice(0, 3);
  return (
    <section aria-label={sectionLabel} className={MATCH_CARD} style={vars}>
      <ProofHighlight level={style} shows={proofShows} />
      <span aria-hidden="true" className="absolute inset-0" style={tint} />
      <div className="relative flex items-center gap-4">
        <MatchRing
          arc={match.arc}
          count={match.sharedCount}
          label={ring}
          level={ringLevel}
          look={MATCH_CARD_RING}
        />
        <p className="m-0 text-body-sm text-white/80">
          {line}
          {hasLevel ? (
            <span
              className="mt-1 block whitespace-nowrap text-title-2 font-semibold"
              style={levelWord}
            >
              {style.word}.
            </span>
          ) : null}
        </p>
      </div>
      <div className="relative">
        <ProofLine match={match} />
      </div>
      {newToYou.length > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="relative h-0.5 rounded-2 bg-white/8"
          />
          <div className="relative">
            <NewToYouPicks picks={newToYou} username={username} />
          </div>
        </>
      ) : null}
    </section>
  );
}

/** The three picks new to you */
const PICKS = [0, 1, 2];

const GHOST_CARD = cn(MATCH_CARD, PULSE);

/**
 * The match card while it streams: the card's flat panel, the ring as a
 * flat circle, the level line, the proof line, the rule and the three picks
 * new to you (posters only), as ghosts.
 */
export function MatchCardSkeleton() {
  return (
    <div aria-hidden="true" className={GHOST_CARD}>
      <div className="flex items-center gap-4">
        <Ghost className="size-[72px] shrink-0 rounded-full" />
        <span className="flex flex-1 flex-col">
          <TextLine className="text-body-sm" width="w-32" />
          <TextLine bar="h-5" className="mt-1 text-title-2" width="w-24" />
        </span>
      </div>
      <span className="flex flex-col">
        <TextLine className="text-body-sm" width="w-full" />
        <TextLine className="text-body-sm" width="w-1/2" />
      </span>
      <Ghost className="h-0.5 rounded-2" />
      <div className="flex flex-col gap-3.5">
        <TextLine className="text-body-sm" width="w-36" />
        <span className="grid grid-cols-3 gap-3">
          {PICKS.map((n) => (
            <Ghost className="aspect-[2/3] w-full rounded-8" key={n} />
          ))}
        </span>
      </div>
    </div>
  );
}
