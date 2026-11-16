import type { WatchingNow } from '@tvseri.es/schemas';

import { progressGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { LINE } from './rowBoxes';

/** "◔ Watching Frieren", or "Not watching anything right now" */
export default function WatchingLine({
  watching,
}: Readonly<{ watching: WatchingNow | null }>) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 text-meta whitespace-nowrap text-white/80 ${LINE.watching}`}
    >
      {watching ? (
        <>
          <Icon
            className="shrink-0 text-cyan"
            glyph={progressGlyph}
            size={13}
          />
          <span className="text-white/60">Watching</span>
          <span className="min-w-0 truncate">{watching.title}</span>
        </>
      ) : (
        <span className="truncate text-white/60">
          Not watching anything right now
        </span>
      )}
    </div>
  );
}
