# List placement

Which of Finished (`WATCHED`), In progress (`IN_PROGRESS`), Resuming soon (`RESUMING_SOON`) and the watchlist a show is in for a user. Derived from their watched items, their skips and TMDB's aired count. Users add only to favourites and the watchlist themselves (`routes/user/index.ts`). The one hand change to the other lists is removing a show from In progress.

## The rule

One rule, used by every writer: `decideListState` (`state.ts`), then `listWrites` (`writes.ts`).

- **Finished**: at least one regular episode watched, and every aired regular episode watched or skipped. Only skips of aired, unwatched regular episodes count (`countDoneSkips`): skipping an episode that hasn't aired never finishes a show.
- **In progress**: something regular watched, not finished. Leaving Finished also means leaving Resuming soon.
- **None** (nothing regular watched, or nothing aired): out of all three.
- Specials (season 0) never count.
- A show's place in its list (`createdAt`) is when the user last watched anything of it.
- **Watchlist**: a show with anything watched has its watchlist entry *parked*, not deleted. If everything is unmarked again it comes back with its original date. A watchlist entry the user removed by hand is forgotten, so an unmark never brings it back.
- Favourites are never changed automatically.
- **Hidden** ("Hide from In progress", the `paused: 'hide'` pref) is no list: a show stays in In progress while hidden. Any new watch, a special included (the user's mark routes, a Plex scrobble) clears it in the same request as the skips (`afterWatching` in `lib/db/prefs`). An import, Undo putting marks back (`POST /watched/batch?restore=true`) and unmarks leave it.

`listWrites` is pure and idempotent, so running it twice writes the same items.

## Three writers, and why

1. **In the mark request** (`syncListsForMark`, `syncListsForSkips`): so the next screen already shows the right lists. Bounded at `MARK_SYNC_MS` (2.5 s) and at most 10 shows. It writes only if In progress and Finished are still as it read them, so a concurrent mark's newer sync wins. It never throws; anything it can't do is left to the stream. Skips write no watched item, so no stream follows them and only this writer and the nightly job place them.
2. **The watched stream** (`lambdas/watched.ts` → `resyncShow`): runs after every watched write, whoever made it (Plex, import, Undo import, account deletion). It is the backstop when the request timed out.
3. **Nightly** (`lambdas/validateWatchedStatusQueue.ts` → `validateUserLists`): heals what the stream missed and handles what no write triggers:
   - A Finished show that's still running moves back to In progress when a new episode airs, with a 2-day margin because TMDB air dates are in the network's time zone.
   - A Finished show whose next episode airs within 14 days goes to Resuming soon.
   - A show that is watched but in neither list is put back only when its newest watch is under 48 hours old (a dropped stream batch). Older, it was removed from In progress by hand, and a hand removal is never undone. Shows on the watchlist, paused or hidden are left alone too.
   - It is capped at 50 list changes per run and 10 per user (`budget.ts`). A night with more is more likely a bug (a key or count change) than real data, and the cap keeps one from emptying everyone's lists. What it refuses heals on later nights.

Each writer covers a real gap: the request can time out, the stream can lag or drop a batch, and new episodes air without anyone writing.
