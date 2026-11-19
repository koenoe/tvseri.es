import { extensionGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import LineSkeleton from '../../_components/LineSkeleton';

/** The status line's shape while its hole streams: icon, name, a bar */
export default function ExtensionStatusSkeleton() {
  return (
    <p
      aria-hidden="true"
      className="flex h-5 min-w-0 items-center gap-2 whitespace-nowrap text-meta text-white/60"
    >
      <Icon glyph={extensionGlyph} size={14} />
      <span className="min-w-0 truncate">
        Chrome extension · <LineSkeleton className="w-40" />
      </span>
    </p>
  );
}
