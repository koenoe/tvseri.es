import type { SharedShow } from '@tvseri.es/schemas';

import type { LevelStyle } from './levels';

/**
 * Proof you can point at: while a name in the proof is hovered or
 * focused, the same show elsewhere on the page (anything with
 * `data-show="{id}"`) gets the level-coloured ring and lifts. Plain CSS
 * with `:has()`, so no client JS and no shared state. Ids are numbers.
 * The `:has()` looks in the profile frame's sidebar only, where the proof
 * is: one on `body` re-checked the whole page each time the pointer passed
 * over anything, as it does all through a scroll.
 */
export default function ProofHighlight({
  level,
  shows,
}: Readonly<{ level: LevelStyle; shows: ReadonlyArray<SharedShow> }>) {
  if (shows.length === 0) {
    return null;
  }
  const rules = shows
    .map((show) => {
      const id = Number(show.id);
      return `[data-profile-frame]:has(>aside [data-proof="${id}"]:is(:hover,:focus-visible)) [data-show="${id}"]{z-index:6;outline:2px solid ${level.hex};outline-offset:4px;box-shadow:0 0 0 7px rgb(${level.rgb} / .12),0 0 34px rgb(${level.rgb} / .4);transform:translateY(-3px)}`;
    })
    .join('');
  return (
    <style>{`[data-show]{transition:transform .15s,box-shadow .15s}${rules}`}</style>
  );
}
