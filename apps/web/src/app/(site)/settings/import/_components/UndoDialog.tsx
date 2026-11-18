'use client';

import { plural } from '@tvseri.es/utils';
import Button from '@/components/ui/button/Button';
import { Dialog, DialogFooter } from '@/components/ui/dialog/Dialog';
import { undoGlyph } from '@/components/ui/icon/glyphs';
import { SOLID_BUTTON } from './styles';

/**
 * "Undo this import?" (a bottom sheet on phones):
 * only the episodes this import added go; earlier marks stay.
 */
export default function UndoDialog({
  onConfirm,
  onOpenChange,
  open,
  written,
}: Readonly<{
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  written: number;
}>) {
  const keep = () => onOpenChange(false);
  const description = `Removes the ${plural(written, 'episode')} this import added. Episodes you had marked before stay as they were.`;
  return (
    <Dialog
      description={description}
      onOpenChange={onOpenChange}
      open={open}
      title="Undo this import?"
      variant="plain"
    >
      <DialogFooter>
        <Button onClick={keep} variant="quiet">
          Keep it
        </Button>
        <Button
          className={SOLID_BUTTON}
          icon={undoGlyph}
          onClick={onConfirm}
          variant="primary"
        >
          Undo import
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
