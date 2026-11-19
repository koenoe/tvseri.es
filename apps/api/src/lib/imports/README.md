# Import and Undo import

A CSV of watched episodes (Netflix's viewing history or any file with mappable columns) goes into the user's history, with an Undo for the last import. The flow across browser, web route and API is described in `apps/web/src/lib/import/contract.ts`. This folder is the API side: `index.ts` (start, check, write), `undo.ts`, `unskipped.ts`.

## Reading the file (browser)

- The file never leaves the browser. One CSV, up to 4 MB (`IMPORT_MAX_FILE_BYTES`), any number of rows, sent in chunks. Only parsed rows reach the server.
- Netflix's `Title,Date` header is recognised; other files are mapped on column names the user can edit.
- Titles like "Show: Season 2: Chapter One" are split by `apps/web/src/lib/import/parseEntry.ts` (season words, "Limited Series", "Specials", episode numbers written as words).
- Dates (`apps/web/src/app/(site)/settings/import/_lib/parseDate.ts`): the day/month order is detected once per file. With no evidence, slash dates are month-first (Netflix) and dot or dash dates day-first, and the UI says the order was assumed. An empty date means "I don't remember". Dates before 2000 or after tomorrow are refused, as the API refuses them.
- The same episode twice becomes one row with the latest date (`prepareRows.ts`, same folder).

## Matching (web route)

`apps/web/src/lib/import/matcher.ts`. Shows match on exact title only. If several shows share the title, the one that certainly has the episode wins; otherwise the user picks (up to 4 candidates). Episodes match by exact title or by number, never by a similar title. A doubtful match is never written. Exact matching misses some rows, but it never writes a wrong one.

## Check, then write (API)

- **Check** (`checkImportBatch`): reports what would be written and what is already watched. Nothing is written.
- **Start** (`startImport`): the import becomes the user's `lastImport`. Starting a new import ends Undo for the previous one, and is refused (409) while that one's Undo is still running: replacing it would drop the skips Undo is about to put back.
- **Write** (`writeImportBatch`): only while the import is open (`assertImportOpen`, else 409). Episodes already watched are left alone, so their dates are kept and Undo never touches them. New ones carry the `importId`. Writing an episode clears its skip; the cleared skips are recorded first (`recordUnskipped`) so Undo can put them back. Unlike a mark, an import never brings a hidden show back: it restores history, it is no new watching. The import's counts (`written`, `skipped`) are added only once the episodes are in, so a failed write counts nothing. Lists follow through the watched stream (`lib/listSync`).
- A session that expires mid-import stops it. After signing in, Continue in the same tab re-sends the chunk that stopped; what it already wrote counts as already watched.
- **Accepted race**: an episode marked by hand between the check and the write is overwritten by the import and would go with an Undo. Rare enough to accept.

## Undo

`requestUndoImport` stamps the import as being undone and queues `undoImport` (`lambdas/undoImport.ts`):

1. Put back the skips the import cleared (`restoreUnskipped`), first, so the stream's sync after each delete already counts them.
2. Delete each watched item that **still carries this import id**, with a conditional delete. Anything re-marked by hand or scrobbled by Plex since has no import id and stays.
3. Stamp `lastImport.undoneAt`.

Undo covers the last import only. It is safe to ask again until it finishes, and it continues across runs for large imports.

**Undo and the streaming sync (accepted):** the sync skips an episode that is already watched, so an episode a CSV import wrote and a later sync met stays tagged with the import. Undoing that import deletes it, and a later sync does not add it back: it reads back only to two days before the last synced date. Undo does exactly what it says: it removes what the import wrote.
