import { describe, expect, it } from 'vitest';

import {
  isCustomList,
  LIST_PREFIX,
  listIndexPk,
  listItemPrefix,
  listItemSk,
  PREF_PREFIX,
  PREF_SERIES_PREFIX,
  parkedWatchlistSk,
  parseListItemSk,
  parsePrefSk,
  prefSk,
  ROLLUP_META_SK,
  ROLLUP_PREFIX,
  ROLLUP_SHOW_PREFIX,
  seriesIndexPk,
  userPk,
} from './keys';

const USER = '01JABCDEFGHJKMNPQRSTVWXYZ0';
const CUSTOM = '01JCUSTOMLISTULID000000000';

/** Stored items keep these strings: every one is pinned byte for byte */
describe('the Lists table keys', () => {
  it('build the partition and sort keys as stored', () => {
    expect(userPk(USER)).toBe('USER#01JABCDEFGHJKMNPQRSTVWXYZ0');
    expect(LIST_PREFIX).toBe('LIST#');
    expect(PREF_PREFIX).toBe('PREF#');
    expect(PREF_SERIES_PREFIX).toBe('PREF#SERIES#');
    expect(ROLLUP_PREFIX).toBe('AGG#');
    expect(ROLLUP_SHOW_PREFIX).toBe('AGG#SHOW#');
    expect(ROLLUP_META_SK).toBe('AGG#META');
    expect(prefSk(1399)).toBe('PREF#SERIES#1399');
    expect(parkedWatchlistSk(1399)).toBe('PARKED#WATCHLIST#1399');
    expect(seriesIndexPk(1399)).toBe('SERIES#1399');
  });

  it('build every default list’s item keys', () => {
    for (const list of [
      'WATCHED',
      'WATCHLIST',
      'FAVORITES',
      'IN_PROGRESS',
      'RESUMING_SOON',
    ]) {
      expect(isCustomList(list)).toBe(false);
      expect(listItemPrefix(list)).toBe(`LIST#${list}#ITEM#`);
      expect(listItemSk(list, 1399)).toBe(`LIST#${list}#ITEM#1399`);
      expect(listIndexPk(USER, list)).toBe(
        `LIST#01JABCDEFGHJKMNPQRSTVWXYZ0#${list}`,
      );
    }
  });

  it('put a custom list’s items under LIST#CUSTOM#', () => {
    expect(isCustomList(CUSTOM)).toBe(true);
    expect(listItemSk(CUSTOM, 7)).toBe(
      'LIST#CUSTOM#01JCUSTOMLISTULID000000000#ITEM#7',
    );
    expect(listIndexPk(USER, CUSTOM)).toBe(
      'LIST#01JABCDEFGHJKMNPQRSTVWXYZ0#01JCUSTOMLISTULID000000000',
    );
  });

  it('parse a default list item’s sort key, and nothing else', () => {
    expect(parseListItemSk('LIST#IN_PROGRESS#ITEM#1399')).toEqual({
      id: 1399,
      listId: 'IN_PROGRESS',
    });
    expect(parseListItemSk('PREF#SERIES#1399')).toBeNull();
    expect(parseListItemSk('PARKED#WATCHLIST#1399')).toBeNull();
    expect(parseListItemSk(`LIST#CUSTOM#${CUSTOM}#ITEM#7`)).toBeNull();
    expect(parseListItemSk('LIST#WATCHED#ITEM#12a')).toBeNull();
  });

  // A Query by prefix must reach only its own kind of item
  it('keep each prefix to its own items', () => {
    const watchlistItem = listItemSk('WATCHLIST', 1399);
    expect(watchlistItem.startsWith(listItemPrefix('WATCHED'))).toBe(false);
    expect(
      listItemSk('WATCHED', 1).startsWith(listItemPrefix('WATCHLIST')),
    ).toBe(false);
    for (const other of [
      prefSk(1399),
      parkedWatchlistSk(1399),
      `${ROLLUP_SHOW_PREFIX}1399`,
      ROLLUP_META_SK,
    ]) {
      expect(other.startsWith(LIST_PREFIX)).toBe(false);
    }
    expect(watchlistItem.startsWith(PREF_PREFIX)).toBe(false);
    expect(watchlistItem.startsWith(ROLLUP_PREFIX)).toBe(false);
  });

  it('parse a prefs sort key back to its show, and nothing else', () => {
    expect(parsePrefSk(prefSk(1399))).toBe(1399);
    expect(parsePrefSk('LIST#WATCHED#ITEM#1399')).toBeNull();
    expect(parsePrefSk('PREF#SERIES#')).toBeNull();
    expect(parsePrefSk('PREF#SERIES#12a')).toBeNull();
  });
});
