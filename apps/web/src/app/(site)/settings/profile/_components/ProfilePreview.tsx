import {
  calendarGlyph,
  eyeGlyph,
  linkGlyph,
  usersGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import Handle from '@/components/ui/identity/Handle';
import {
  IDENTITY_BLOCK,
  IdentityLine,
  IdentityLines,
} from '@/components/ui/identity/IdentityLines';
import WatchesOn from '@/components/ui/identity/WatchesOn';

type PreviewLogo = Readonly<{ id: number; logo: string; name: string }>;

export type PreviewData = Readonly<{
  /** "Member since Mar 2024" */
  member: string | null;
  /** "4,812 episodes, 212 finished" */
  episodes: string | null;
  /** "6 followers · 8 following" */
  people: string | null;
  logos: ReadonlyArray<PreviewLogo>;
}>;

function MetaLine({
  glyph,
  text,
}: Readonly<{ glyph: Glyph | ToggleGlyph; text: string | null }>) {
  if (!text) {
    return null;
  }
  return <IdentityLine glyph={glyph}>{text}</IdentityLine>;
}

/** The 300px sidebar column the handle is fitted to (narrower on a small phone) */
const COLUMN = `@container w-75 max-w-full ${IDENTITY_BLOCK}`;

/**
 * How visitors see the profile sidebar: the profile's own identity (its
 * handle, meta lines and services line, the same components and measures),
 * at the sidebar's 300px width on the static ground; narrower on a small
 * phone, where the handle fits the column it has. The handle follows the
 * Username field as you type. No Follow button: only what the form and the
 * services change.
 */
export default function ProfilePreview({
  data,
  username,
}: Readonly<{ data: PreviewData; username: string }>) {
  return (
    <div
      aria-label="Preview of your profile sidebar"
      className="flex flex-col gap-10 rounded-16 bg-[#1c2223] px-6 py-8 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]"
      role="img"
    >
      <section className={COLUMN}>
        <Handle as="p" username={username} />
        <IdentityLines>
          <MetaLine glyph={calendarGlyph} text={data.member} />
          <MetaLine glyph={eyeGlyph} text={data.episodes} />
          <MetaLine glyph={usersGlyph} text={data.people} />
        </IdentityLines>
        <WatchesOn isOwner={false} providers={data.logos} />
      </section>
    </div>
  );
}

/** The line under the card; shared with the placeholder (`ProfileSkeleton`) */
export const PREVIEW_FOOT =
  'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-meta text-white/60';

/** "Preview · how visitors see you": static, so the placeholder draws it too */
export function PreviewLabel() {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon active glyph={eyeGlyph} size={13} />
      Preview · how visitors see you
    </span>
  );
}

/** "Preview · how visitors see you" and the live link, under the card. */
export function PreviewFoot({ username }: Readonly<{ username: string }>) {
  return (
    <span className={PREVIEW_FOOT}>
      <PreviewLabel />
      <span className="inline-flex items-center gap-2">
        <Icon glyph={linkGlyph} size={13} />
        {`tvseri.es/u/${username || '…'}`}
      </span>
    </span>
  );
}
