import type { WebhookStatus } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { plexCardPlan } from './plexCard';

const TOKEN = 'f00df00df00df00df00df00d';

const LATEST = {
  episodeNumber: 2,
  seasonNumber: 4,
  seriesId: 62852,
  title: 'Billions',
  watchedAt: 1_762_000_000_000,
};

const CONNECTED: WebhookStatus = {
  connected: true,
  createdAt: '2025-02-01T10:00:00.000Z',
  lastAccount: { id: 1, title: 'rae' },
  lastReceivedAt: 1_762_000_000_000,
  onlyAccount: null,
  paused: false,
  recent: [LATEST],
  urlWorks: true,
  week: [],
};

describe('plexCardPlan', () => {
  it('tells the panel a URL exists, never the token', () => {
    // A status that (wrongly) carried the token still doesn't hand it on
    const leaky = { ...CONNECTED, token: TOKEN } as WebhookStatus;
    const plan = plexCardPlan(leaky);
    expect(plan.panel.hasUrl).toBe(true);
    expect(JSON.stringify(plan)).not.toContain(TOKEN);
  });

  it('passes on that the edge refuses the URL', () => {
    expect(plexCardPlan({ ...CONNECTED, urlWorks: false }).panel.urlWorks).toBe(
      false,
    );
  });

  it('names the saved account for "Only …", else the last scrobble’s', () => {
    const only = { id: 7, title: 'koen' };
    expect(
      plexCardPlan({ ...CONNECTED, onlyAccount: only }).panel,
    ).toMatchObject({ account: only, onlyAccountId: 7 });
    expect(plexCardPlan(CONNECTED).panel).toMatchObject({
      account: { id: 1, title: 'rae' },
      onlyAccountId: null,
    });
  });

  it('spotlights the newest scrobble, and counts the Recent list', () => {
    const plan = plexCardPlan(CONNECTED);
    expect(plan.spotlight).toEqual(LATEST);
    expect(plan.panel.recentCount).toBe(1);
    expect(plexCardPlan({ ...CONNECTED, recent: [] }).spotlight).toBeNull();
  });

  it('draws a card that isn’t connected with nothing to show', () => {
    expect(plexCardPlan({ connected: false })).toEqual({
      panel: {
        account: null,
        connected: false,
        hasUrl: false,
        lastReceivedAt: null,
        onlyAccountId: null,
        paused: false,
        recentCount: 0,
        urlWorks: true,
      },
      spotlight: null,
    });
  });
});
