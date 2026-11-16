import Button from '@/components/ui/button/Button';
import { historyGlyph } from '@/components/ui/icon/glyphs';

/**
 * After Undo import. Without `onStartAgain` (the
 * Upload step, where the drop zone is right there) it has no button.
 */
export default function UndoneCard({
  onStartAgain,
}: Readonly<{ onStartAgain?: () => void }>) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-16 bg-white/4 p-8"
      role="status"
    >
      <b className="text-title-3">Import undone</b>
      <span className="text-body-sm text-white/60">
        Everything it added is gone. Episodes you had marked before are
        untouched.
      </span>
      {onStartAgain ? (
        <Button icon={historyGlyph} onClick={onStartAgain} variant="tonal">
          Start again
        </Button>
      ) : null}
    </div>
  );
}
