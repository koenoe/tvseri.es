import { plural } from '@tvseri.es/utils';
import Button from '@/components/ui/button/Button';
import {
  clockGlyph,
  downloadGlyph,
  showGlyph,
  undoGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import LocalMoment from '../../_components/LocalMoment';
import type { UndoableImport } from '../_lib/lastImport';
import { META_ITEM, META_ROW } from './styles';

/**
 * "Your last import · 1,834 episodes added · Imported today at 21:14 ·
 * Undo import" for an import that isn't on screen as a result (it stopped,
 * was left, or ran before a reload). Built from the
 * result's quiet "Undo import" and the undone card's surface.
 */
export default function LastImportRow({
  last,
  onUndo,
  undoing,
}: Readonly<{
  last: UndoableImport;
  onUndo: () => void;
  undoing: boolean;
}>) {
  const added = `${plural(last.written, 'episode')} added`;
  const label = undoing ? 'Undoing…' : 'Undo import';
  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-x-4 gap-y-2 rounded-16 bg-white/4 px-6 py-4 md:grid-cols-[16px_minmax(0,1fr)_auto] md:items-center">
      <Icon
        className="text-white/60 max-md:mt-1"
        glyph={downloadGlyph}
        size={16}
      />
      <span className="flex min-w-0 flex-col gap-1">
        <b className="text-body-sm font-semibold">Your last import</b>
        <span className={`${META_ROW} text-white/60`}>
          <span className={META_ITEM}>
            <Icon glyph={showGlyph} size={13} />
            {added}
          </span>
          <span className={META_ITEM}>
            <Icon glyph={clockGlyph} size={13} />
            <LocalMoment at={last.createdAt} prefix="Imported " style="at" />
          </span>
        </span>
      </span>
      <Button
        className="justify-self-start has-[>svg:first-child]:pl-4 max-md:col-start-2 max-md:-ml-4"
        icon={undoGlyph}
        onClick={onUndo}
        pending={undoing}
        variant="quiet"
      >
        {label}
      </Button>
    </div>
  );
}
