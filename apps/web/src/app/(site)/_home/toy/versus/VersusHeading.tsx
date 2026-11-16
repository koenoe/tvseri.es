import { swapGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';

import { VERSUS_LINE } from './copy';
import { VERSUS_HEAD, VERSUS_HEAD_ICON } from './layout';

const signedIn = { [SIGNED_IN_ONLY]: '' };
const signedOut = { [SIGNED_OUT_ONLY]: '' };

/**
 * Versus's heading, the line over the comparison: the
 * swap icon and "Similar, and you haven't seen either. Which first?" for a
 * signed-in viewer, "Similar. Which first?" signed out. The cached HTML is
 * the same for everyone: both lines are in it and the pre-paint viewer hint
 * shows one (`components/ui/viewer/reveal`). The block has no title above
 * it: this line is its heading.
 */
export default function VersusHeading({ id }: Readonly<{ id?: string }>) {
  // in each line, inline with its words: a wrapped line keeps it beside them
  const icon = (
    <Icon className={VERSUS_HEAD_ICON} glyph={swapGlyph} size={16} />
  );
  return (
    <h2 className={VERSUS_HEAD} id={id}>
      <span {...signedOut}>
        {icon}
        {VERSUS_LINE.signedOut}
      </span>
      <span className="hidden" {...signedIn}>
        {icon}
        {VERSUS_LINE.signedIn}
      </span>
    </h2>
  );
}
