import type { SeriesRuntimes } from '@tvseri.es/schemas';

/** What the progress hole draws the viewer's line with, besides the marks */
export type LineInputs = Readonly<{
  runtimes: SeriesRuntimes;
  nextAirDate: string | null;
}>;

/** Enough for a session's worth of shows; the oldest goes first */
const LIMIT = 50;

/** Per tab (client only): the hole's inputs, per show, as it last drew them */
const lines = new Map<number, LineInputs>();

/**
 * The hole drew the viewer's line for this show: kept, so a later visit in
 * this tab draws the same line before the hole streams in again
 * (`ProgressFallback`). Never on the server: a module there outlives the
 * request.
 */
export function rememberLine(seriesId: number, inputs: LineInputs): void {
  if (typeof window === 'undefined' || lines.get(seriesId) === inputs) {
    return;
  }
  lines.delete(seriesId);
  lines.set(seriesId, inputs);
  if (lines.size > LIMIT) {
    const oldest = lines.keys().next().value;
    if (oldest !== undefined) {
      lines.delete(oldest);
    }
  }
}

/** The inputs the hole last drew this show's line with in this tab */
export const rememberedLine = (seriesId: number): LineInputs | undefined =>
  lines.get(seriesId);

/** Tests: a fresh tab */
export const forgetLines = (): void => lines.clear();
