import { usersGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { CIRCLE_COPY, followNobodyLine } from '../_lib/circleCopy';

/**
 * You follow nobody: one calm card, then the people who
 * already follow you, with Follow back.
 */
export default function FollowNobody({
  followers,
}: Readonly<{ followers: number }>) {
  return (
    <div className="flex items-center gap-4 rounded-16 bg-white/4 px-6 py-5">
      <span
        aria-hidden="true"
        className="size-3 shrink-0 rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255/0.6)]"
      />
      <span className="shrink-0 text-white/60">
        <Icon glyph={usersGlyph} size={24} />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[15px] leading-6 font-semibold text-white">
          {CIRCLE_COPY.followNobody}
        </p>
        <p className="m-0 text-meta text-white/60">
          {followNobodyLine(followers)}
        </p>
      </div>
    </div>
  );
}
