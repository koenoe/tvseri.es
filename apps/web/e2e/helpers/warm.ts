import { type APIRequestContext, expect } from '@playwright/test';

/**
 * A page whose shell the build prerendered can be sitting in its
 * "unavailable" state: a read of the stub API timed out while the machine
 * was loaded, so the page is cached as its placeholder for 30 seconds
 * (`CACHE_LIFE.unavailable`, by design). A spec that asserts what is in the
 * shell (content, sizes, the shell's boxes) first asks for the page until
 * it carries `marker`, which only the answered read renders (each visit
 * after the 30 seconds regenerates it in the background).
 */
export async function expectShellFilled(
  request: APIRequestContext,
  path: string,
  marker: string,
) {
  let asked = 0;
  await expect
    .poll(
      async () => {
        asked += 1;
        return (await (await request.get(path)).text()).includes(marker);
      },
      {
        intervals: [500, 1000, 2000],
        message: `${path} is still its placeholder (no "${marker}")`,
        timeout: 90_000,
      },
    )
    .toBe(true);
  if (asked > 1) {
    // evidence for the report: how often the machine's load did this
    console.log(`[warm] ${path} was its placeholder; filled on try ${asked}`);
  }
}
