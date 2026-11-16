import {
  type CheckEvent,
  type ErrorEvent,
  IMPORT_CHUNK_SIZE,
  IMPORT_ENDPOINT,
  IMPORT_MAX_ROWS_PER_REQUEST,
  type ImportEvent,
  type ImportRow,
} from './contract';
import { readNdjson } from './ndjson';

/** Why a run stopped before its last chunk (the board's "Stopped" banner). */
export type StopReason = ErrorEvent['error'];

export type RunOutcome =
  | Readonly<{ status: 'done' }>
  | Readonly<{ status: 'aborted' }>
  /** `chunk`: the chunk to resume from (it did not finish) */
  | Readonly<{ status: 'stopped'; reason: StopReason; chunk: number }>;

type Answer<Kind> = Kind extends 'check' ? CheckEvent : ImportEvent;
type Success<Kind> = Exclude<Answer<Kind>, ErrorEvent>;

export type RunOptions<Kind extends 'check' | 'import'> = Readonly<{
  /** `check` = the dry run (nothing written); `import` writes */
  kind: Kind;
  rows: ReadonlyArray<ImportRow>;
  /** Required for `import` */
  importId?: string;
  /** The chunk to start from (resume) */
  from?: number;
  signal: AbortSignal;
  /** Every event of a chunk, in order, as it streams in */
  onEvent: (event: Success<Kind>, chunk: number) => void;
  /** The chunk's response ended cleanly: resume after it */
  onChunkDone?: (chunk: number) => void;
  fetcher?: typeof fetch;
}>;

/** Rows per request: the Check sends the most the route takes (it writes nothing) */
const CHUNK_SIZE = {
  check: IMPORT_MAX_ROWS_PER_REQUEST,
  import: IMPORT_CHUNK_SIZE,
} as const;

/** Check requests in flight at once (the import's stay one after another) */
const CHECK_CONCURRENCY = 3;

/** One show's rows: a picked series, else the title as the matcher reads it */
const showKey = (row: ImportRow) =>
  row.seriesId === undefined
    ? row.title.trim().toLowerCase()
    : `#${row.seriesId}`;

/**
 * The rows in chunks of at most `size`, each show's rows together (in the
 * order shows first appear; a show with more rows than a chunk fills whole
 * chunks in a row). The route matches a chunk with one matcher, so a show is
 * searched and its seasons read once per run, not once per chunk it was
 * spread over. Deterministic: the same rows always give the same chunks (a
 * stopped import resumes by chunk number).
 */
export function planChunks(
  rows: ReadonlyArray<ImportRow>,
  size: number,
): ReadonlyArray<ReadonlyArray<ImportRow>> {
  const shows = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const key = showKey(row);
    const show = shows.get(key);
    if (show) {
      show.push(row);
    } else {
      shows.set(key, [row]);
    }
  }
  const chunks: ImportRow[][] = [];
  let current: ImportRow[] = [];
  const flush = () => {
    if (current.length > 0) {
      chunks.push(current);
      current = [];
    }
  };
  for (const show of shows.values()) {
    if (current.length + show.length > size) {
      flush();
    }
    for (const row of show) {
      if (current.length === size) {
        flush();
      }
      current.push(row);
    }
  }
  flush();
  return chunks;
}

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const SUCCESS_STATUS = { check: 'checked', import: 'progress' } as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stopReasonOf = (status: number): StopReason =>
  status === 401 ? 'unauthenticated' : status === 409 ? 'conflict' : 'failed';

/**
 * Posts the prepared rows to the import route in chunks (`planChunks`: each
 * show's rows together) and reads each NDJSON answer as it streams. The
 * import sends them one after another; the Check keeps
 * `CHECK_CONCURRENCY` in flight. Stops at the first error (a 401 or an
 * `unauthenticated` event is the session ending) and says which chunk to
 * resume from; an abort (the user left, or changed the columns) ends
 * quietly.
 */
export async function runChunks<Kind extends 'check' | 'import'>({
  fetcher = fetch,
  from = 0,
  importId,
  kind,
  onChunkDone,
  onEvent,
  rows,
  signal,
}: RunOptions<Kind>): Promise<RunOutcome> {
  const url =
    kind === 'check' ? `${IMPORT_ENDPOINT}?dryRun=1` : IMPORT_ENDPOINT;
  const chunks = planChunks(rows, CHUNK_SIZE[kind]);

  /** One chunk's request and its stream; null when it went through */
  const send = async (chunk: number): Promise<RunOutcome | null> => {
    const stopped = (reason: StopReason): RunOutcome => ({
      chunk,
      reason,
      status: 'stopped',
    });
    try {
      const slice = chunks[chunk];
      const response = await fetcher(url, {
        body: JSON.stringify(
          kind === 'check' ? { rows: slice } : { importId, rows: slice },
        ),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal,
      });
      if (!response.ok || !response.body) {
        return stopped(stopReasonOf(response.status));
      }
      for await (const value of readNdjson(response.body)) {
        if (!isRecord(value)) {
          return stopped('failed');
        }
        if (value.status === 'error') {
          const error = value.error;
          return stopped(
            error === 'unauthenticated' || error === 'conflict'
              ? error
              : 'failed',
          );
        }
        if (value.status !== SUCCESS_STATUS[kind]) {
          return stopped('failed');
        }
        onEvent(value as Success<Kind>, chunk);
      }
      if (signal.aborted) {
        return { status: 'aborted' };
      }
      onChunkDone?.(chunk);
      return null;
    } catch (error) {
      if (signal.aborted || isAbort(error)) {
        return { status: 'aborted' };
      }
      return stopped('failed');
    }
  };

  // The import writes chunk after chunk (a stop resumes at its chunk); the
  // Check, which writes nothing and only adds counts up, keeps a few in flight
  const workers = kind === 'check' ? CHECK_CONCURRENCY : 1;
  let next = from;
  let outcome: RunOutcome | null = null;
  const work = async () => {
    while (outcome === null && next < chunks.length) {
      const chunk = next;
      next += 1;
      const result = await send(chunk);
      outcome ??= result;
    }
  };
  await Promise.all(Array.from({ length: workers }, work));
  return outcome ?? { status: 'done' };
}
