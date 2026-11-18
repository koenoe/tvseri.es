import { readDisplayUsername } from '@/auth/displayUsername';
import { PROMPT_HINT_KEY, PROMPT_HINT_VERSION } from '@/lib/viewer/htmlHints';

/** Most shows kept: past this the oldest answers drop out. */
const MAX_IDS = 500;

/**
 * Remembers on this browser that the first-tracking prompt is done for a
 * show: answered by the signed-in viewer (`u` = their display username) or
 * dismissed by a visitor (`u` = ''). The pre-paint script reads it and hides
 * the prompt before the first paint next time (`data-show-prompt="no"`).
 * Storage can throw (private mode): then there is no hint.
 */
export function rememberPromptAnswer(seriesId: number): void {
  try {
    const owner = readDisplayUsername(document.cookie) ?? '';
    const raw = window.localStorage.getItem(PROMPT_HINT_KEY);
    const hint: unknown = raw ? JSON.parse(raw) : null;
    const ids =
      hint &&
      typeof hint === 'object' &&
      'v' in hint &&
      hint.v === PROMPT_HINT_VERSION &&
      'u' in hint &&
      hint.u === owner &&
      'ids' in hint &&
      Array.isArray(hint.ids)
        ? hint.ids.filter((id): id is number => typeof id === 'number')
        : [];
    if (ids.includes(seriesId)) {
      return;
    }
    window.localStorage.setItem(
      PROMPT_HINT_KEY,
      JSON.stringify({
        ids: [...ids, seriesId].slice(-MAX_IDS),
        u: owner,
        v: PROMPT_HINT_VERSION,
      }),
    );
  } catch {
    // no storage, no hint
  }
}
