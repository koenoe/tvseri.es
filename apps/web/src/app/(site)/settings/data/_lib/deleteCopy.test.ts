import { describe, expect, it } from 'vitest';

import { deleteDialogText } from './deleteCopy';

describe('delete account copy', () => {
  it('names the history', () => {
    expect(deleteDialogText(4812)).toBe(
      'Your history (4,812 episodes), watchlist, favourites, Plex link and profile are deleted for good. Download your data first if you want a copy.',
    );
    expect(deleteDialogText(null)).toMatch(/^Your history, watchlist/);
  });
});
