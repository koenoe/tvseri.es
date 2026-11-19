import { sleep } from '@tvseri.es/utils';

/** 1.5 to 4 seconds, never the same twice: a fixed beat is a script's signature */
export const humanPauseMs = (random: () => number = Math.random) =>
  1500 + Math.floor(random() * 2500);

/** Spaces one session's requests like a person's; time already spent counts towards the pause */
export const createPacer = (
  wait: (ms: number) => Promise<unknown> = sleep,
  now: () => number = Date.now,
  pauseMs: () => number = humanPauseMs,
) => {
  let last: number | null = null;
  return async () => {
    if (last !== null) {
      const left = pauseMs() - (now() - last);
      if (left > 0) {
        await wait(left);
      }
    }
    last = now();
  };
};
