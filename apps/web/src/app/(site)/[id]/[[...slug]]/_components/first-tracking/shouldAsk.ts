import { hasHistory } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';

/**
 * "Seen The Bear before?" for a signed-in viewer: nothing tracked for
 * the show (no regular episode watched or skipped: specials alone don't
 * count, see `hasHistory`) and the prompt never answered.
 * Any mark or answer hides it for good. Unknown prefs (the status read
 * failed) never ask.
 */
export function shouldAskFirstTracking(
  view: Pick<SeriesBase, 'prefs' | 'skipped' | 'watched'> | undefined,
  signedIn: boolean,
): boolean {
  return (
    signedIn &&
    view !== undefined &&
    view.prefs !== null &&
    view.prefs.firstTrackingAnsweredAt === null &&
    !hasHistory(view)
  );
}

/**
 * What the prompt (static shell content, shown to everyone) does once the
 * page knows the viewer: `unknown` keeps the shell's choice (shown, unless
 * this browser's pre-paint hint hid it: signed out, still hydrating, or the
 * viewer's marks not in yet), `ask` shows it even over a stale hint, `hide`
 * takes it away (answered, tracked, or the viewer's marks didn't load).
 */
export function promptDecision(
  view:
    | Pick<SeriesBase, 'prefs' | 'skipped' | 'unavailable' | 'watched'>
    | undefined,
  signedIn: boolean | undefined,
): 'unknown' | 'ask' | 'hide' {
  if (signedIn !== true || view === undefined) {
    return 'unknown';
  }
  if (view.unavailable) {
    return 'hide';
  }
  return shouldAskFirstTracking(view, true) ? 'ask' : 'hide';
}
