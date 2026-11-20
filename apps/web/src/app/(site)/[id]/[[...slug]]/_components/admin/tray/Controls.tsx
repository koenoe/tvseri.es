import { memo } from 'react';

import FillRing from '@/components/motion/FillRing';
import { undoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { Status } from '../picker';
import {
  quietButton,
  RING_INK_DARK,
  RING_STROKE,
  RING_TRACK_DARK,
  statusChip,
  trayButton,
} from './styles';

/** Automatic, Your pick · saved, Unsaved, Saving… */
export const StatusChip = memo(function StatusChip({
  status,
}: Readonly<{ status: Status }>) {
  const className = statusChip({ kind: status.kind });
  return (
    <span aria-live="polite" className={className}>
      {status.label}
    </span>
  );
});

StatusChip.displayName = 'StatusChip';

/** "Save for everyone"; while saving, the ring fills once and it says Saving…. */
export const SaveButton = memo(function SaveButton({
  busy,
  disabled,
  onSave,
  size = 'md',
}: Readonly<{
  busy: boolean;
  disabled: boolean;
  onSave: () => void;
  size?: 'md' | 'sm';
}>) {
  const className = trayButton({ size, tone: 'solid' });
  const blocked = disabled && !busy;
  return (
    <button
      aria-busy={busy}
      aria-disabled={blocked}
      className={className}
      onClick={onSave}
      type="button"
    >
      {busy ? (
        <FillRing
          className={RING_STROKE}
          ink={RING_INK_DARK}
          size={18}
          track={RING_TRACK_DARK}
        />
      ) : null}
      <span>{busy ? 'Saving…' : 'Save for everyone'}</span>
    </button>
  );
});

SaveButton.displayName = 'SaveButton';

/** "Reset to automatic": once a pick is saved. */
export const ResetButton = memo(function ResetButton({
  onReset,
  phone = false,
}: Readonly<{ onReset: () => void; phone?: boolean }>) {
  const className = quietButton({ size: phone ? 'phone' : 'md' });
  return (
    <button className={className} onClick={onReset} type="button">
      <Icon glyph={undoGlyph} size={16} />
      <span>Reset to automatic</span>
    </button>
  );
});

ResetButton.displayName = 'ResetButton';

export type ConfirmCopy = Readonly<{
  no: string;
  question: string;
  yes: string;
}>;

export const CONFIRM: Readonly<Record<'discard' | 'reset', ConfirmCopy>> = {
  discard: {
    no: 'Keep editing',
    question: 'Discard your changes?',
    yes: 'Discard',
  },
  reset: {
    no: 'Cancel',
    question: 'Reset to TMDB’s picks for everyone?',
    yes: 'Reset',
  },
};
