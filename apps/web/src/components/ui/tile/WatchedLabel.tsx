import { GLASS_LIGHT } from '@/components/ui/glass/glass';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

const LABEL = `inline-flex h-5.5 items-center gap-1.5 rounded-full pr-2 pl-1.5 md:h-6.5 md:pr-2.25 md:pl-1.75 bg-[rgb(23_23_23/0.55)] text-caption font-medium text-white ${GLASS_LIGHT}`;

/**
 * The glass "Watched" label on a poster: 26px pill, 13px eye,
 * caption 500 white, on #171717 at 55% with a 12px backdrop blur and the
 * glass's inner light. Put it in PosterTile's `overlay` slot (from a client
 * island when the cached row can't know the viewer); its text joins the
 * link's name: "Severance Watched".
 */
export default function WatchedLabel() {
  return (
    <span className={LABEL}>
      <Icon glyph={eyeGlyph} size={13} />
      Watched
    </span>
  );
}
