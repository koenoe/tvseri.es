import { test } from '@playwright/test';

/**
 * The wait for what streams in after an `instant()` scope releases. The
 * page's dynamic parts arrive in one RSC refresh, beside the segment
 * prefetches the hydrated shell sends; with 14 workers on one machine the
 * profile's took longer than the default 10s in over half the runs, never
 * 30s. Two thirds of the test's own budget, so the slow clamp (`E2E_SLOW`)
 * scales it too. Pass it to the first expectation after the scope that
 * waits on content the shell didn't carry: `{ timeout: afterRelease() }`.
 */
export const afterRelease = () => (test.info().timeout * 2) / 3;
