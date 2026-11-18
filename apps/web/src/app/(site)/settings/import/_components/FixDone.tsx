import { checkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { Fix } from '../_lib/importState';
import { LINK } from './styles';

/** A dash: "Skipped" (no shared glyph draws it). */
function Minus() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={13}
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={13}
    >
      <path d="M5 12h14" />
    </svg>
  );
}

/**
 * An item once it's sorted out: "✓ Imported as Top Boy
 * (2019)" or "– Skipped", with Undo while it can still be undone (a skip
 * always; a pick until it's sent).
 */
export default function FixDone({
  fix,
  onUndo,
}: Readonly<{ fix: Fix; onUndo: () => void }>) {
  const canUndo = fix.kind === 'skipped' || fix.status === 'waiting';
  const label =
    fix.kind === 'skipped'
      ? 'Skipped'
      : fix.status === 'failed'
        ? `Couldn’t import as ${fix.label}`
        : `Imported as ${fix.label}`;
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 text-meta leading-5 text-white/80"
    >
      {fix.kind === 'skipped' ? (
        <Minus />
      ) : (
        <Icon glyph={checkGlyph} size={13} />
      )}
      {label}
      {canUndo || fix.status === 'failed' ? (
        <button className={LINK} onClick={onUndo} type="button">
          {fix.kind === 'picked' && fix.status === 'failed'
            ? 'Try again'
            : 'Undo'}
        </button>
      ) : null}
    </div>
  );
}
