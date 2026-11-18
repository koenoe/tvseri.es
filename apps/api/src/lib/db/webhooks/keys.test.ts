import { describe, expect, it } from 'vitest';

import { userTypeIndexPk, webhookPk } from './keys';

// Stored items keep the format they were written with: these strings must
// never change
describe('WebhookTokens table keys', () => {
  it('builds the item and gsi1 keys', () => {
    expect(webhookPk('abc')).toBe('TOKEN#abc');
    expect(userTypeIndexPk('01JA', 'plex')).toBe('USER#01JA#TYPE#plex');
  });
});
