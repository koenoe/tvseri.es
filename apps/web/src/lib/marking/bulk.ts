import type {
  BulkLibraryInput,
  BulkLibraryOp,
  BulkLibraryResult,
  LibraryIds,
} from '@tvseri.es/schemas';
import type { ActionResult } from '@/lib/actions/result';
import { withMembership } from './state';
import type { MarkingStoreApi } from './store';
import { reportFailure, type ToastInput } from './toasts';

/** One selected show: its id and its date on the shelf (Undo re-adds with it) */
export type BulkItem = Readonly<{ id: number; addedAt?: number }>;

export type BulkDeps = Readonly<{
  bulkLibrary: (
    input: BulkLibraryInput,
  ) => Promise<ActionResult<BulkLibraryResult>>;
  isSignedIn: () => boolean;
  promptSignIn: () => void;
  store: MarkingStoreApi;
  toast: (input: ToastInput) => void;
}>;

export type BulkOptions = Readonly<{
  /** After Undo put everything back (the page reloads its list) */
  onUndone?: () => void;
}>;

/** Undo of each op */
const INVERSE: Readonly<Record<BulkLibraryOp, BulkLibraryOp>> = {
  'favourites-add': 'favourites-remove',
  'favourites-remove': 'favourites-add',
  hide: 'unhide',
  unhide: 'hide',
  'watchlist-add': 'watchlist-remove',
  'watchlist-remove': 'watchlist-add',
};

const shows = (count: number) => `${count} series`;

/** "Removed 4 series from your watchlist" */
const DONE: Readonly<Record<BulkLibraryOp, (count: number) => string>> = {
  'favourites-add': (n) => `Added ${shows(n)} to your favourites`,
  'favourites-remove': (n) => `Removed ${shows(n)} from your favourites`,
  hide: (n) => `Hid ${shows(n)} from in progress`,
  unhide: (n) => `Brought ${shows(n)} back to in progress`,
  'watchlist-add': (n) => `Added ${shows(n)} to your watchlist`,
  'watchlist-remove': (n) => `Removed ${shows(n)} from your watchlist`,
};

/** "2 couldn't be removed" */
const FAILED: Readonly<Record<BulkLibraryOp, string>> = {
  'favourites-add': 'added',
  'favourites-remove': 'removed',
  hide: 'hidden',
  unhide: 'brought back',
  'watchlist-add': 'added',
  'watchlist-remove': 'removed',
};

/** The list an op changes in the library ids, and how */
const LIST_CHANGE: Readonly<
  Partial<Record<BulkLibraryOp, readonly [keyof LibraryIds, boolean]>>
> = {
  'favourites-add': ['favorites', true],
  'favourites-remove': ['favorites', false],
  'watchlist-add': ['watchlist', true],
  'watchlist-remove': ['watchlist', false],
};

/**
 * The Library's bulk actions: the library ids change at once, one server
 * action does the writes (6 at a time, on the server), one toast says what
 * happened with Undo (the inverse op, with each show's original date), and
 * shows that failed roll back with "2 couldn't be removed · Try again".
 * Lists and prefs only: no watched write exists here.
 * Resolves which shows were done and which failed.
 */
export function createBulk(deps: BulkDeps) {
  const { store } = deps;

  function applyIds(op: BulkLibraryOp, ids: ReadonlyArray<number>) {
    const change = LIST_CHANGE[op];
    if (change) {
      const [list, on] = change;
      store
        .getState()
        .updateLibraryIds((library) => withMembership(library, list, ids, on));
    }
  }

  async function bulk(
    op: BulkLibraryOp,
    items: ReadonlyArray<BulkItem>,
    options: BulkOptions & Readonly<{ quiet?: boolean }> = {},
  ): Promise<BulkLibraryResult> {
    const none = { done: [], failed: items.map((item) => item.id) };
    if (items.length === 0) {
      return { done: [], failed: [] };
    }
    if (!deps.isSignedIn()) {
      deps.promptSignIn();
      return none;
    }
    const ids = items.map((item) => item.id);
    applyIds(op, ids);
    const result = await deps
      .bulkLibrary({
        items: items.map(({ addedAt, id }) =>
          addedAt === undefined ? { id } : { addedAt, id },
        ),
        op,
      })
      .catch(() => null);
    if (!result?.ok) {
      applyIds(INVERSE[op], ids);
      reportFailure(deps, result?.error);
      return none;
    }
    const { done, failed } = result.data;
    applyIds(INVERSE[op], failed);
    if (failed.length > 0) {
      const retry = items.filter((item) => failed.includes(item.id));
      deps.toast({
        action: {
          label: 'Try again',
          onClick: () => {
            void bulk(op, retry, options);
          },
        },
        title: `${failed.length} couldn’t be ${FAILED[op]}`,
        tone: 'error',
      });
    } else if (!options.quiet) {
      const undo = items.filter((item) => done.includes(item.id));
      deps.toast({
        action: {
          label: 'Undo',
          onClick: () => {
            void bulk(INVERSE[op], undo, { quiet: true }).then((back) => {
              if (back.done.length > 0) {
                options.onUndone?.();
              }
            });
          },
        },
        title: DONE[op](done.length),
      });
    }
    return { done, failed };
  }

  return bulk;
}

export type Bulk = ReturnType<typeof createBulk>;
