'use client';

import type { ConnectionLatest } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';

import cn from '@/lib/cn';

import LocalMoment from '../../_components/LocalMoment';
import type { ServiceCardStatus } from '../_lib/serviceCard';
import { OPTIONS_CLASS } from './layout';
import OptionRow from './OptionRow';
import ServiceAccountActions from './ServiceAccountActions';
import { useConnectedService } from './ServiceContext';
import ServiceSyncRow from './ServiceSyncRow';

/** The newest entry in the profile's history, like Plex's last scrobble. */
function LatestEntry({ latest }: Readonly<{ latest: ConnectionLatest }>) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-12 bg-black/28 px-4 py-3">
      <p className="min-w-0 truncate text-body-sm text-white">
        <b>{latest.title}</b>
        {latest.episodeTitle ? <> — {latest.episodeTitle}</> : null}
      </p>
      <span className="shrink-0 text-meta text-white/60">
        <LocalMoment at={latest.watchedAt} prefix="Watched " style="at" />
      </span>
    </div>
  );
}

const profileLine = ({
  profileName,
  total,
}: Pick<ServiceCardStatus, 'profileName' | 'total'>): string =>
  [
    profileName ?? 'Your profile',
    total === null
      ? null
      : `${total.toLocaleString('en-GB')} episodes in its history`,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The connected body: once synced, the live activity (as Plex's); before
 * that, the history's newest entry from the link. Then the profile (for a
 * service that has profiles), the sync row, the review list and Disconnect.
 */
export default function ServiceConnectedBody({
  activity,
  syncNow,
  live,
  onDisconnected,
  reconnecting,
  review,
  status,
}: Readonly<{
  activity: ReactNode;
  syncNow: boolean;
  live: boolean;
  onDisconnected: () => void;
  /** The reconnect block leads the body: it says why nothing syncs */
  reconnecting: boolean;
  review: ReactNode;
  status: ServiceCardStatus;
}>) {
  const { copy, hairline } = useConnectedService();
  const { lastSyncedAt, latest } = status;
  const options = cn(OPTIONS_CLASS, live && hairline);
  const profile = profileLine(status);
  return (
    <>
      {live ? activity : null}
      {!live && latest ? <LatestEntry latest={latest} /> : null}
      <div className={options}>
        {copy.profileTitle === null ? null : (
          <OptionRow description={profile} title={copy.profileTitle} />
        )}
        <ServiceSyncRow
          lastSyncedAt={lastSyncedAt}
          reconnecting={reconnecting}
          resumeFrom={status.resumeFrom}
          sync={status.sync}
          syncNow={syncNow}
          total={status.total}
        />
      </div>
      {review}
      <ServiceAccountActions onDisconnected={onDisconnected} />
    </>
  );
}
