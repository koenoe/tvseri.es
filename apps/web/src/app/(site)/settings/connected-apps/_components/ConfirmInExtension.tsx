import { extensionGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/**
 * The extension has the code and waits for the viewer in its popup: the
 * code to compare there, and where the popup is.
 */
export default function ConfirmInExtension({
  code,
}: Readonly<{ code: string }>) {
  const spoken = `Code ${[...code].join(' ')}`;
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3.5 gap-y-1 rounded-14 bg-black/20 p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
      <span className="row-span-2 flex size-9 items-center justify-center rounded-10 bg-white/8">
        <Icon glyph={extensionGlyph} size={18} />
      </span>
      <b className="text-body-sm font-semibold">Confirm in the extension</b>
      <span className="text-meta text-white/80">
        <span className="sr-only">{spoken}</span>
        <span aria-hidden="true">
          Code <b className="font-bold tracking-[0.1em]">{code}</b>
        </span>{' '}
        · top right of Chrome
      </span>
    </div>
  );
}
