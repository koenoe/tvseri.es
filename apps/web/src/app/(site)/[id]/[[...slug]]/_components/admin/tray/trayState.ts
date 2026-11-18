import type { Selection, TitleKey } from '../picker';

/**
 * The tray's own state: the pick, the inline confirm (Cancel with
 * changes asks "Discard your changes?", Reset asks "Reset to TMDB's picks
 * for everyone?"), the running write, the last failed write (the phone sheet
 * shows it inline) and the phone tab. Pure, so every transition is tested.
 */
export type Confirm = 'discard' | 'reset';
export type Write = 'reset' | 'save';
export type Tab = 'backdrop' | 'title';

export type TrayState = Readonly<{
  busy: Write | null;
  confirm: Confirm | null;
  failed: Write | null;
  /** Null until the first pick: the tray shows what visitors see. */
  picked: Selection | null;
  tab: Tab;
}>;

/** A pick starts from `base` (what visitors see) until the first one. */
export type TrayAction =
  | Readonly<{ type: 'pick'; base: Selection; backdrop: string }>
  | Readonly<{ type: 'pick'; base: Selection; title: TitleKey }>
  | Readonly<{ type: 'ask'; confirm: Confirm }>
  | Readonly<{ type: 'keep' }>
  | Readonly<{ type: 'start'; write: Write }>
  | Readonly<{ type: 'fail'; write: Write }>
  | Readonly<{ type: 'tab'; tab: Tab }>;

export const initialTrayState: TrayState = {
  busy: null,
  confirm: null,
  failed: null,
  picked: null,
  tab: 'backdrop',
};

/** Picking is locked while a write runs or a confirm asks. */
export const isLocked = (state: TrayState): boolean =>
  state.busy !== null || state.confirm !== null;

export function trayReducer(state: TrayState, action: TrayAction): TrayState {
  switch (action.type) {
    case 'pick': {
      if (isLocked(state)) {
        return state;
      }
      const from = state.picked ?? action.base;
      const picked =
        'backdrop' in action
          ? { ...from, backdrop: action.backdrop }
          : { ...from, title: action.title };
      return { ...state, failed: null, picked };
    }
    case 'ask':
      return state.busy ? state : { ...state, confirm: action.confirm };
    case 'keep':
      return { ...state, confirm: null };
    case 'start':
      return state.busy
        ? state
        : { ...state, busy: action.write, confirm: null, failed: null };
    case 'fail':
      return { ...state, busy: null, failed: action.write };
    case 'tab':
      return { ...state, tab: action.tab };
  }
}
