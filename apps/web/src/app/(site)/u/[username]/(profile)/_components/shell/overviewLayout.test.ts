import { describe, expect, it } from 'vitest';

import { OVERVIEW_SIDEBAR } from './overviewLayout';

describe('OVERVIEW_SIDEBAR', () => {
  it('drops the sticky move’s 64px room on the overview, so the tail sits only the row gap under the sidebar', () => {
    expect(OVERVIEW_SIDEBAR.split(' ')).toContain('lg:profile-overview:mb-0');
  });
});
