import type { CSSProperties } from 'react';

import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import type { Profile } from '../../_data/profile';
import LevelMeter from '../blocks/LevelMeter';
import SharedCount from '../blocks/SharedCount';
import { loadMatch } from './loadMatch';
import { levelStyle } from './match/levels';
import { compatibilityLead } from './match/matchCopy';
import NewToYouPicks from './match/NewToYouPicks';
import ProofHighlight from './match/ProofHighlight';
import ProofLine from './match/ProofLine';

/** The card's panel (its ghost takes the same) */
const MATCH_CARD =
  'relative flex flex-col gap-5 overflow-hidden rounded-16 bg-black/22 px-5 pt-[22px] pb-5';

/** The level meter and the shared count, under the level word */
const METER_ROW = 'flex h-5 items-center gap-3.5';

/**
 * The match card: the level word in its colour, the level meter with the
 * shared count, the proof you can point at, then New to you from them. No
 * level under five shared shows: a plain line and an unlit meter.
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
  const line = compatibilityLead(username, hasLevel);
  const meterLevel = hasLevel ? match.level : null;
  const sectionLabel = `Your match with ${username}`;
  const proofShows = match.sharedShows.slice(0, 3);
  return (
    <section aria-label={sectionLabel} className={MATCH_CARD} style={vars}>
      <ProofHighlight level={style} shows={proofShows} />
      <span aria-hidden="true" className="absolute inset-0" style={tint} />
      <div className="relative flex flex-col items-start gap-3">
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
        <div className={METER_ROW}>
          <LevelMeter level={meterLevel} size="card" />
          <SharedCount count={match.sharedCount} />
        </div>
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
 * The match card while it streams: the card's flat panel, the level line,
 * the meter and the count, the proof line, the rule and the three picks new
 * to you (posters only), as ghosts.
 */
export function MatchCardSkeleton() {
  return (
    <div aria-hidden="true" className={GHOST_CARD}>
      <div className="flex flex-col gap-3">
        <span className="flex flex-col">
          <TextLine className="text-body-sm" width="w-32" />
          <TextLine bar="h-5" className="mt-1 text-title-2" width="w-24" />
        </span>
        <span className={METER_ROW}>
          <Ghost className="h-[18px] w-20 rounded-4" />
          <TextLine className="text-[12.5px] leading-5" width="w-28" />
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
