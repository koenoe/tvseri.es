import type { Metadata } from 'next';
import SectionErrorBoundary from '../_components/SectionErrorBoundary';
import SectionHeader from '../_components/SectionHeader';
import SettingsHole from '../_components/SettingsHole';
import { AppsAccordion } from './_components/AppsAccordion';
import ComingNextCard from './_components/ComingNextCard';
import PlexCard from './_components/PlexCard';
import PlexSkeleton from './_components/PlexSkeleton';
import ViaTraktCard from './_components/ViaTraktCard';

/** The section's skeleton: its hole's fallback and its failure's space */
const plexSkeleton = <PlexSkeleton />;

export const metadata: Metadata = { title: 'Connected apps' };

/** Connected apps: Plex live, Jellyfin and Emby next. */
export default function Page() {
  return (
    <section className="flex flex-col gap-6" data-testid="route-settings-plex">
      <SectionHeader
        lede="Your media server marks episodes watched here the moment you finish them."
        title="Connected apps"
      />
      <AppsAccordion>
        <SectionErrorBoundary placeholder={plexSkeleton} what="Plex">
          <SettingsHole fallback={plexSkeleton} name="plex">
            <PlexCard />
          </SettingsHole>
        </SectionErrorBoundary>
        <ComingNextCard app="jellyfin" />
        <ComingNextCard app="emby" />
      </AppsAccordion>
      <ViaTraktCard />
    </section>
  );
}
