import type { Fix } from './fix';
import type { ProblemItem } from './problems';

/** Items shown one by one before the rest is summed up (2). */
const VISIBLE = 2;

/** The rows behind these problem items */
export const rowsIn = (items: ReadonlyArray<ProblemItem>) =>
  items.reduce((sum, item) => sum + item.indexes.length, 0);

/** The items not fixed or skipped yet */
export const openItems = (
  items: ReadonlyArray<ProblemItem>,
  fixes: Readonly<Record<string, Fix>>,
) => items.filter((item) => !fixes[item.key]);

/** The rows of the items not fixed or skipped yet */
export const openRows = (
  items: ReadonlyArray<ProblemItem>,
  fixes: Readonly<Record<string, Fix>>,
) => rowsIn(openItems(items, fixes));

/**
 * A group's items one by one and the summed-up rest: all of them once shown
 * in full, or when only one would be left over.
 */
export const splitItems = (items: ReadonlyArray<ProblemItem>, all: boolean) =>
  all || items.length <= VISIBLE + 1
    ? { rest: [], shown: items }
    : { rest: items.slice(VISIBLE), shown: items.slice(0, VISIBLE) };
