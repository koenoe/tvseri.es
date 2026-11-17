# Account deletion

`DELETE /me` (`routes/me/index.ts`), then three queued steps (`delete.ts`, run by `lambdas/deleteAccount.ts` on `DeleteAccountQueue`, see `infra/deleteAccount.ts`).

## At once, in the request

1. The user types their username to confirm. The server checks it against the session and uses the session's user, never the typed text.
2. The Users item is stamped `deletionRequestedAt`. From then on the user is signed out everywhere (`middleware/auth.ts` answers `AccountGone`), and their profile, member search entry and follow lists disappear.
3. Plex (every scrobble provider) webhook tokens are deleted, so scrobbles stop right away.
4. The `data` step is queued. If queueing fails, the stamp is cleared again so the user can retry.

## The steps

| Step | When | Deletes |
|---|---|---|
| `data` | at once | follows, both ways (the follow stream fixes other users' counts), then every watched item (the watched stream then clears lists) |
| `lists` | 15 min later | lists and per-show prefs, the sign-ins (refresh rows in the auth service's storage, one partition per role, `authSubject` in `@tvseri.es/utils`), cached counters and stats, the username and email claims (only if they still name this user), then the Users item |
| `sweep` | 15 min after that | follows, watched items, sign-ins and lists once more, for anything written meanwhile (a queued scrobble, a list the stream rebuilt, a sign-in) |

The 15-minute gaps let the streams reacting to the previous step settle. Otherwise they would write list rows after `lists` deleted them. About 30 minutes end to end. Once the email claim is gone, the same address can sign up again as a new account.

## Safety

- A step runs only for a user who asked: the Users item has `deletionRequestedAt`, or it is already gone (a re-run). The final delete of the Users item is conditional on the same thing.
- Message validation: a known step and a ULID user id.
- Every step deletes only what's still there, so a retry or a duplicate message is harmless. A step that runs out of Lambda time re-queues itself, so large histories continue across several runs.
- Failures retry, then go to `DeleteAccountDLQ`, which is alarmed (`infra/alerts.ts`). If `data` dead-letters, the later steps never run: the account stays signed out and hidden until the message is redriven.
- Two rare request windows remain. Stamped, but queueing and the clear both failed: the user is locked out with nothing queued. Plex unlinked, but the queue failed: the account is kept and Plex must be linked again.
- Production tables that hold user data have point-in-time recovery (`infra/dynamo/backup.ts`), so a wrong delete can be recovered.
