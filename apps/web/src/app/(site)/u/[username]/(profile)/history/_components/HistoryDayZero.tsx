import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph, historyGlyph } from '@/components/ui/icon/glyphs';

import EmptyState from '../../_components/blocks/EmptyState';

/**
 * History with nothing in it: the empty line, then for
 * the owner the way to bring a history in (import a file, connect Plex) or
 * start one by marking an episode. A visitor gets the empty line only.
 */
export default function HistoryDayZero({
  owner,
  username,
}: Readonly<{ owner: boolean; username: string }>) {
  if (!owner) {
    const visitorSub = `Episodes ${username} marks land here by day.`;
    return (
      <EmptyState
        glyph={historyGlyph}
        sub={visitorSub}
        title="Nothing watched yet"
      />
    );
  }
  return (
    <div className="flex flex-col">
      <EmptyState
        glyph={historyGlyph}
        sub="Every episode you mark lands here by day, newest first."
        title="Nothing watched yet"
      />
      <h3 className="mt-6 text-[15px] font-semibold leading-6">
        Bring your history in
      </h3>
      <p className="mt-1 text-meta text-white/60">
        Years of episodes in one go, or every episode you finish from now on.
        Either is enough.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <ButtonLink
          href="/settings/import"
          icon={arrowRightGlyph}
          variant="primary"
        >
          Import a file
        </ButtonLink>
        <ButtonLink href="/settings/plex" icon={arrowRightGlyph} size="sm">
          Connect Plex
        </ButtonLink>
      </div>
      <p className="mt-4 text-meta text-white/60">
        Or open any series and tap the eye on an episode.
      </p>
    </div>
  );
}
