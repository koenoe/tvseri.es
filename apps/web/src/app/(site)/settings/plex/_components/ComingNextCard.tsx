import { clockGlyph, plugGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import AppCard from './AppCard';
import AppHeader from './AppHeader';
import AppPill from './AppPill';
import AppStatus from './AppStatus';
import { AppBody, type AppId, AppToggle } from './AppsAccordion';
import AppTile from './AppTile';

type Server = Readonly<{
  app: Exclude<AppId, 'plex'>;
  description: string;
  name: string;
  /** "the free Webhook plugin, from Jellyfin’s plugin catalogue." */
  needs: string;
  needsPill: string;
}>;

const SERVERS: Readonly<Record<Server['app'], Server>> = {
  emby: {
    app: 'emby',
    description:
      'Marks episodes watched the moment Emby finishes them, using Emby’s built-in webhooks.',
    name: 'Emby',
    needs: 'Emby Premiere: webhooks are a Premiere feature.',
    needsPill: 'Needs Emby Premiere',
  },
  jellyfin: {
    app: 'jellyfin',
    description:
      'Marks episodes watched the moment Jellyfin finishes them, using the official Webhook plugin.',
    name: 'Jellyfin',
    needs: 'the free Webhook plugin, from Jellyfin’s plugin catalogue.',
    needsPill: 'Free Webhook plugin',
  },
};

/**
 * Jellyfin and Emby: wanted next, not live. Details
 * is an honest panel: what it will do, what it needs, and that there is
 * nothing to set up yet. No URL, no create button, no toast.
 */
export default function ComingNextCard({
  app,
}: Readonly<{ app: Server['app'] }>) {
  const server = SERVERS[app];
  const pills = (
    <>
      <AppPill tone="state">Coming next</AppPill>
      <AppPill>{server.needsPill}</AppPill>
    </>
  );
  return (
    <AppCard brand={app}>
      <AppHeader
        name={server.name}
        pills={pills}
        status={<AppStatus>Not available yet</AppStatus>}
        tile={<AppTile app={app} />}
      >
        <AppToggle app={app} closedLabel="Details" name={server.name} />
      </AppHeader>
      <AppBody app={app}>
        <div className="flex max-w-160 flex-col gap-3">
          <p className="text-body-sm text-white/80">{server.description}</p>
          <p className="flex items-center gap-1.5 text-meta text-white/60">
            <Icon glyph={plugGlyph} size={13} />
            <span>
              <b className="mr-1 font-normal text-white">Needs</b>
              {server.needs}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-meta text-white/60">
            <Icon glyph={clockGlyph} size={13} />
            <span>
              Coming next. There’s nothing to set up yet: the setup appears here
              when {server.name} support is live.
            </span>
          </p>
        </div>
      </AppBody>
    </AppCard>
  );
}
