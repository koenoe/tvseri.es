import { describe, expect, it } from 'vitest';

import { playwrightArgs } from './e2eArgs.ts';

describe('playwrightArgs', () => {
  it('passes what follows -- to Playwright', () => {
    expect(playwrightArgs(['--', 'e2e/show.spec.ts', '--workers=2'])).toEqual({
      args: ['e2e/show.spec.ts', '--workers=2'],
      dropped: null,
    });
  });

  it('passes bare arguments too', () => {
    expect(playwrightArgs(['e2e/show.spec.ts'])).toEqual({
      args: ['e2e/show.spec.ts'],
      dropped: null,
    });
  });

  it('drops a leading app name, which as a filter matches every spec under apps/web', () => {
    expect(playwrightArgs(['web', 'e2e/show.spec.ts'])).toEqual({
      args: ['e2e/show.spec.ts'],
      dropped: 'web',
    });
    expect(playwrightArgs(['web', '--', 'e2e/show.spec.ts'])).toEqual({
      args: ['e2e/show.spec.ts'],
      dropped: 'web',
    });
  });

  it('runs the whole suite without arguments', () => {
    expect(playwrightArgs([])).toEqual({ args: [], dropped: null });
    expect(playwrightArgs(['web'])).toEqual({ args: [], dropped: 'web' });
  });
});
