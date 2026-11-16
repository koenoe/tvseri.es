import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';
import { loadSettingsCounts } from '../../_data/counts';
import { getSettingsSession, getSettingsViewer } from '../../_data/session';
import { formatMonthYear } from '../../_lib/format';
import ProfileEditor from './ProfileEditor';
import type { PreviewData } from './ProfilePreview';

const PREVIEW_LOGOS = 6;

const joinParts = (parts: ReadonlyArray<string | null>) => {
  const present = parts.filter((part): part is string => part !== null);
  return present.length > 0 ? present : null;
};

/**
 * The streamed part of Profile: the session (the saved name, username and
 * email) and the counts the preview shows. Only the fields the client uses
 * cross to it.
 */
export default async function ProfileSection() {
  const [{ user }, counts] = await Promise.all([
    getSettingsSession(),
    getSettingsViewer().then(({ id }) => loadSettingsCounts(id)),
  ]);

  const since = formatMonthYear(user.createdAt);
  const episodes = joinParts([
    counts.episodes === null ? null : plural(counts.episodes, 'episode'),
    counts.finished === null
      ? null
      : `${formatGrouped(counts.finished)} finished`,
  ]);
  const people = joinParts([
    counts.followers === null ? null : plural(counts.followers, 'follower'),
    counts.following === null
      ? null
      : `${formatGrouped(counts.following)} following`,
  ]);
  const preview: PreviewData = {
    episodes: episodes?.join(', ') ?? null,
    logos: (user.watchProviders ?? [])
      .slice(0, PREVIEW_LOGOS)
      .map(({ id, logo, name }) => ({ id, logo, name })),
    member: since ? `Member since ${since}` : null,
    people: people?.join(' · ') ?? null,
  };

  return (
    <ProfileEditor
      email={user.email ?? '—'}
      initial={{ name: user.name ?? '', username: user.username }}
      preview={preview}
    />
  );
}
