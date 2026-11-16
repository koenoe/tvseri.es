/**
 * "Neighbours never repeat": a landing's
 * rows run top to bottom and each one drops the shows of every row above it,
 * in every tab state. A row with a switch (kind tabs, Next door) shows a
 * different list per tab, so a row below it drops a different set per tab:
 * the server plans every tab state here and the client picks the drops for
 * the tab it has pressed (`visibleShows`).
 *
 * One switch per row (bounded rows, one switch each). A row that
 * sits below two or more switches drops the union of their tabs, which can
 * hide a few more shows than needed but never repeats one.
 */

type WithId = Readonly<{ id: number }>;

/** A row's source, top to bottom: one list, or one list per tab of a switch */
export type RowSource<T extends WithId> =
  | Readonly<{
      kind: 'shows';
      shows: ReadonlyArray<T>;
      /** how many it draws, when not the plan's (Where to start: 3, a spotlight: 1) */
      limit?: number;
      /** one show by design (a spotlight): never left out for the minimum */
      single?: boolean;
    }>
  | Readonly<{
      kind: 'tabs';
      limit?: number;
      /** unique on the page; the client keys the pressed tab by it */
      switchId: string;
      tabs: Readonly<Record<string, ReadonlyArray<T>>>;
    }>;

/** Per switch above, per tab: the ids that switch's row shows in that tab */
export type DropsByTab = Readonly<
  Record<string, Readonly<Record<string, ReadonlyArray<number>>>>
>;

export type PlannedRow<T extends WithId> =
  | Readonly<{
      kind: 'shows';
      shows: ReadonlyArray<T>;
      drops: DropsByTab;
      /** how many it draws */
      limit: number;
    }>
  | Readonly<{
      kind: 'tabs';
      switchId: string;
      tabs: Readonly<Record<string, ReadonlyArray<T>>>;
      drops: DropsByTab;
      limit: number;
    }>;

/** The pressed tab per switch id (a switch not in it shows its first tab) */
export type PressedTabs = Readonly<Record<string, string | undefined>>;

const firstTab = (tabs: Readonly<Record<string, unknown>>) =>
  Object.keys(tabs)[0];

/**
 * The ids to drop for the pressed tabs: the union over every switch above.
 */
const droppedIds = (drops: DropsByTab, pressed: PressedTabs) => {
  const dropped = new Set<number>();
  for (const [switchId, byTab] of Object.entries(drops)) {
    const tab = pressed[switchId] ?? firstTab(byTab);
    for (const id of tab ? (byTab[tab] ?? []) : []) {
      dropped.add(id);
    }
  }
  return dropped;
};

/**
 * What a planned list shows for the pressed tabs, cut to `limit` after the
 * drops (so a dropped show makes room for the next one).
 */
export function visibleShows<T extends WithId>(
  shows: ReadonlyArray<T>,
  drops: DropsByTab,
  pressed: PressedTabs,
  limit: number,
): ReadonlyArray<T> {
  const dropped = droppedIds(drops, pressed);
  return shows.filter((show) => !dropped.has(show.id)).slice(0, limit);
}

/**
 * The shows not already shown above, in their order (the hub's sections use
 * it too). A show a list names twice is kept once, the first: a row never
 * draws one show twice, whatever a source sends.
 */
export const withoutShown = <T extends WithId>(
  shows: ReadonlyArray<T>,
  shown: ReadonlySet<number>,
): ReadonlyArray<T> => {
  const own = new Set<number>();
  return shows.filter(
    (show) => !shown.has(show.id) && !own.has(show.id) && own.add(show.id),
  );
};

/** Every id of one or more lists */
export const idsOf = (
  ...lists: ReadonlyArray<ReadonlyArray<WithId>>
): ReadonlySet<number> =>
  new Set(lists.flatMap((list) => list.map((show) => show.id)));

const ids = <T extends WithId>(shows: ReadonlyArray<T>) =>
  shows.map((show) => show.id);

/** Whether a row drawing `count` of `limit` shows is left out for the minimum */
const tooFew = (count: number, limit: number, min: number) =>
  Math.min(count, limit) < min;

/**
 * Plans every row against the rows above it. Each list keeps every show not
 * dropped for sure (the rows above without a switch); the drops that depend
 * on a pressed tab travel with the row as `drops`. `limit` is how many shows
 * a row draws, unless its source sets its own.
 *
 * `min` (`MIN_POSTERS`): a row that would draw fewer shows
 * than this after the rows above is left out (no shows), as is a switch's
 * tab; a switch row with no tab left has none. What is left out drops
 * nothing below, so the next rows keep those shows. A `single` source (a
 * spotlight) is one show by design and never left out.
 */
export function neverRepeat<T extends WithId>(
  rows: ReadonlyArray<RowSource<T>>,
  limit: number,
  min = 0,
): ReadonlyArray<PlannedRow<T>> {
  const seen = new Set<number>();
  const switched: Record<string, Record<string, ReadonlyArray<number>>> = {};

  return rows.map((row) => {
    const rowLimit = row.limit ?? limit;
    const drops: DropsByTab = Object.fromEntries(
      Object.entries(switched).map(([id, byTab]) => [id, { ...byTab }]),
    );
    const switchesAbove = Object.keys(drops);

    if (row.kind === 'shows') {
      const kept = withoutShown(row.shows, seen);
      const shows =
        !row.single && tooFew(kept.length, rowLimit, min) ? [] : kept;
      if (switchesAbove.length === 1) {
        // exact per tab: what this row shows depends on that one switch
        const [above] = switchesAbove as [string];
        const byTab = drops[above] ?? {};
        for (const tab of Object.keys(byTab)) {
          const shown = visibleShows(shows, drops, { [above]: tab }, rowLimit);
          switched[above] = {
            ...switched[above],
            [tab]: [...(switched[above]?.[tab] ?? []), ...ids(shown)],
          };
        }
      } else {
        for (const id of ids(shows.slice(0, rowLimit))) {
          seen.add(id);
        }
      }
      return { drops, kind: 'shows', limit: rowLimit, shows };
    }

    const tabs = Object.fromEntries(
      Object.entries(row.tabs).flatMap(([tab, shows]) => {
        const kept = withoutShown(shows, seen);
        return tooFew(kept.length, rowLimit, min) ? [] : [[tab, kept]];
      }),
    );
    if (Object.keys(tabs).length > 0) {
      switched[row.switchId] = Object.fromEntries(
        Object.entries(tabs).map(([tab, shows]) => [
          tab,
          ids(shows.slice(0, rowLimit)),
        ]),
      );
    }
    return {
      drops,
      kind: 'tabs',
      limit: rowLimit,
      switchId: row.switchId,
      tabs,
    };
  });
}

/**
 * How many shows a planned row can draw at most: its list (or its fullest
 * tab) after the rows above without a switch, up to its limit.
 */
export function plannedShows<T extends WithId>(plan: PlannedRow<T>): number {
  const lists = plan.kind === 'shows' ? [plan.shows] : Object.values(plan.tabs);
  return Math.min(plan.limit, Math.max(0, ...lists.map((list) => list.length)));
}
