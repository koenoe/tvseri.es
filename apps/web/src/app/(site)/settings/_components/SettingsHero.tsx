import { Suspense } from 'react';
import {
  calendarGlyph,
  eyeGlyph,
  showGlyph,
  variantSignalGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { plural } from '@/lib/format/text';

import { loadSettingsCounts } from '../_data/counts';
import { loadPlexStatus } from '../_data/plex';
import { getSettingsSession, getSettingsViewer } from '../_data/session';
import { formatMonthYear } from '../_lib/format';
import { plexStateOf } from '../_lib/plexState';
import LineSkeleton from './LineSkeleton';

const PLEX_WORD = {
  broken: 'not working',
  none: 'not connected',
  on: 'receiving',
  paused: 'paused',
  wait: 'waiting',
} as const;

async function Handle() {
  const { user } = await getSettingsSession();
  return user.username;
}

async function PlexItem() {
  const { accessToken } = await getSettingsViewer();
  const status = await loadPlexStatus(accessToken);
  if (!status) {
    return null;
  }
  return (
    <MetaItem icon={variantSignalGlyph}>
      Plex {PLEX_WORD[plexStateOf(status)]}
    </MetaItem>
  );
}

async function HeroMeta() {
  const [{ user }, counts] = await Promise.all([
    getSettingsSession(),
    getSettingsViewer().then(({ id }) => loadSettingsCounts(id)),
  ]);
  const since = formatMonthYear(user.createdAt);
  return (
    <MetaRow className="gap-x-4 gap-y-2 text-white/80 max-md:gap-x-3 max-md:text-white/60">
      {since ? (
        <MetaItem className="max-md:hidden" icon={calendarGlyph}>
          Member since {since}
        </MetaItem>
      ) : null}
      {counts.episodes !== null ? (
        <MetaItem active icon={eyeGlyph}>
          {plural(counts.episodes, 'episode')}
        </MetaItem>
      ) : null}
      {counts.shows !== null ? (
        <MetaItem icon={showGlyph}>
          {plural(counts.shows, 'series', 'series')}
        </MetaItem>
      ) : null}
      <span className="contents max-md:hidden">
        <PlexItem />
      </span>
    </MetaRow>
  );
}

/**
 * The typographic header:
 * the overline, @handle in display and a meta row. No backdrop.
 */
export default function SettingsHero() {
  return (
    <header className="flex flex-col gap-2 md:gap-2">
      <span className="text-overline text-white/60 uppercase">Settings</span>
      <h1 className="font-display text-display">
        {/* contrast-exempt: the @ mark */}
        <span className="mr-0.5 align-[0.214em] text-white/40">@</span>
        <Suspense fallback={<LineSkeleton className="w-48" />}>
          <Handle />
        </Suspense>
      </h1>
      <Suspense
        fallback={
          <div className="h-5">
            <LineSkeleton className="w-80" />
          </div>
        }
      >
        <HeroMeta />
      </Suspense>
    </header>
  );
}
