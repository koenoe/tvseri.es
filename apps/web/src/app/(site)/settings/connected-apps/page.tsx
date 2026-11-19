import { CONNECTION_SERVICES } from '@tvseri.es/schemas';
import type { Metadata } from 'next';
import { HowItWorksDialog } from '@/components/extension/HowItWorks';
import StreamedSlot from '@/components/ui/StreamedSlot';
import SectionErrorBoundary from '../_components/SectionErrorBoundary';
import SectionHeader from '../_components/SectionHeader';
import { connectedService } from '../_lib/services';
import { AppsAccordion } from './_components/AppsAccordion';
import ExtensionStatus from './_components/ExtensionStatus';
import ExtensionStatusSkeleton from './_components/ExtensionStatusSkeleton';
import PlexCard from './_components/PlexCard';
import PlexSkeleton from './_components/PlexSkeleton';
import ServiceCard from './_components/ServiceCard';
import ServiceSkeleton from './_components/ServiceSkeleton';

/** Each card's skeleton: its hole's fallback and its failure's space */
const plexSkeleton = <PlexSkeleton />;
const services = CONNECTION_SERVICES.map((service) => ({
  name: connectedService(service).name,
  service,
  skeleton: <ServiceSkeleton service={service} />,
}));

const extensionSkeleton = <ExtensionStatusSkeleton />;

export const metadata: Metadata = { title: 'Connected apps' };

/**
 * Connected apps: the extension's status, then Plex's webhook and each
 * streaming service's extension link, each streamed in; How it works opens
 * over the page.
 */
export default function Page() {
  return (
    <section
      className="flex flex-col gap-6"
      data-testid="route-settings-connected-apps"
    >
      <SectionHeader
        lede="Your media server and streaming services mark episodes watched here."
        title="Connected apps"
      />
      <StreamedSlot fallback={extensionSkeleton} name="extension">
        <ExtensionStatus />
      </StreamedSlot>
      <AppsAccordion>
        <SectionErrorBoundary placeholder={plexSkeleton} what="Plex">
          <StreamedSlot fallback={plexSkeleton} name="plex">
            <PlexCard />
          </StreamedSlot>
        </SectionErrorBoundary>
        {services.map(({ name, service, skeleton }) => (
          <SectionErrorBoundary
            key={service}
            placeholder={skeleton}
            what={name}
          >
            <StreamedSlot fallback={skeleton} name={service}>
              <ServiceCard service={service} />
            </StreamedSlot>
          </SectionErrorBoundary>
        ))}
      </AppsAccordion>
      {/* A card's How it works opens the drawing here, never leaving Settings */}
      <HowItWorksDialog />
    </section>
  );
}
