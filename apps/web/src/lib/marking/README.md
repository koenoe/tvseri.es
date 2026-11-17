# Marking

Every mark, unmark, skip and list change goes through one path: a control → `useMarking()` (`useMarking.tsx`) → the command layer (`commands.ts`) → a server action (`actions.ts`) → the API. Signed out, every press opens the sign-in prompt and writes nothing. One path keeps the rules below in one place.

## States

An episode is **watched** (with a date), **watched, date unknown** ("I don't remember"), **skipped**, or nothing (`episodeState` in `progress.ts`). A watched record always beats a skip.

- **Next up**: the first aired regular episode that's neither watched nor skipped.
- **Finished**: at least one episode watched, and every aired regular episode watched or skipped. **In progress**: at least one watched, not finished. Nothing watched: neither. A fully skipped show never counts as finished.
- **Caught up** isn't stored: it's shown when there's no Next up and the show is still running, because it changes with every new airing.
- **Specials** (season 0) never count: not for progress, Next up, finished, lists, counters or stats. They are optional viewing and would otherwise block "finished". They can still be marked one by one.

The API applies the same rule for lists: `apps/api/src/lib/listSync/state.ts`.

## Marking and dates

- The eye on one episode: watched → unmark; anything else (skipped included) → mark "Just now".
- After a single "Just now" mark on the show page (not in the watch-history sheet), the toast offers "Mark the N before too" (aired, unwatched, unskipped earlier episodes of that season; `openBefore`). Not for season 0, and not once the show's "Never for this show" is set.
- Quick "Just now" marks of one show within 2 minutes merge into one toast; one Undo undoes them all (`createMergeRun` in `toasts.ts`). Any other command ends the run. This stops a toast storm while ticking through a binge.
- Date choices (`when.ts`): Just now · Yesterday (same clock time) · Last weekend (Saturday 21:00) · a picked day (21:00 local, never in the future) · On release day (local noon of the air date, `server/batch.ts`) · I don't remember. Dates before 2000 are refused (`packages/schemas/src/watched.ts`).
- "I don't remember" counts for progress, lists and all-time totals, but never appears in History or year stats: an undated watch can't belong to a year.
- Marking a watched episode again overwrites it; that's how re-dating works. The eye never does this by accident because it unmarks a watched episode.
- Season or whole-show eye: anything aired not watched → mark it all; all aired watched → unmark it all. The whole-show unmark deletes every record of the show, specials included (`unmarkTvSeriesWatched` in the API).
- "I'm up to…" (`markUpTo`): marks every open aired episode up to the target (earlier seasons too), then unmarks watched episodes after it in the target's season only. It is one run: the unmark is sent only after the mark saved, and Try again redoes both.
- "Seen it" / "Finished it all" mark every aired, unwatched episode as "I don't remember"; existing dates are kept.
- A show with any watched episode can't be put on the watchlist: the API would take it off again at the next mark.

## When things go wrong

- Changes show at once (`store.ts`: a server `base` plus optimistic `pending` ops). If the API fails, they roll back with "Couldn't save that. It's back as it was." and Try again. A partial save keeps what saved and rolls back the rest (`savedOps` in `chain.ts`).
- Undo restores exactly the episodes it touched: date, no-date flag, a known service (Plex) and the import it came from, so Undo import can still remove it (`restoreOps` in `state.ts`).
- Writes for one show run strictly in order (`createChains` in `chain.ts`). A seed older than the store's `version` is ignored, so stale page data (an old RSC payload on Back) can never undo a newer mark.
- The press gate (`pressGate.ts`): the second click of a multi-click never counts, and a control is inert while its own write is out. Marking moves things under the pointer (the Next up pill re-renders in place), so a double tap would otherwise press what slid in.
- If a show's marks failed to load (`SeriesBase.unavailable`), every command on it is refused ("Your progress for this series didn't load…"), so a toggle can't delete marks the page couldn't see.

## Limits

- A whole-show mark takes up to 1,000 aired episodes (`MAX_EPISODES_PER_SERIES_MARK`, a 413 above it); larger shows are marked season by season.
- One action takes up to 2,000 episodes (`MAX_EPISODES_PER_MARK_ACTION`); bigger sets are split automatically.

## What changes automatically

List placement (In progress, Finished, Resuming soon, the watchlist) is the API's job: see `apps/api/src/lib/listSync/README.md`. In short: after a mark the show moves between In progress and Finished by the rule above, and leaves the watchlist as soon as a regular episode is watched. In this tab, In progress and Finished update at once; the watchlist follows on the next page load. Favourites never change automatically.

"Hide from In progress" keeps the show listed but out of the overview blocks; a later mark does not un-hide it. Shows not watched for 90 days appear under Paused (`apps/api/src/lib/overview/blocks.ts`).

Plex scrobbles (`apps/api/src/lambdas/scrobble.ts`) count only watched episodes from a TV library. They are dated when the webhook was queued, so retries and redrives keep the real date. They carry the source "Plex", overwrite an existing mark and clear a skip like any other mark.
