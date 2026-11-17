import type { Metadata } from 'next';
import StreamedSlot from '@/components/ui/StreamedSlot';
import SectionErrorBoundary from '../_components/SectionErrorBoundary';
import SectionHeader from '../_components/SectionHeader';
import ServicesSkeleton from './_components/ServicesSkeleton';
import StreamingServicesSection from './_components/StreamingServicesSection';

/** The section's skeleton: its hole's fallback and its failure's space */
const servicesSkeleton = <ServicesSkeleton />;

export const metadata: Metadata = { title: 'Streaming services' };

/** Streaming services: region and the services you use. */
export default function Page() {
  return (
    <section
      className="flex flex-col gap-6"
      data-testid="route-settings-streaming-services"
    >
      <SectionHeader
        lede="Where to watch lists these first on every series, and Discover can filter by them."
        title="Streaming services"
      />
      <SectionErrorBoundary placeholder={servicesSkeleton} what="Your services">
        <StreamedSlot
          className="flex flex-col gap-6"
          fallback={servicesSkeleton}
          name="services"
        >
          <StreamingServicesSection />
        </StreamedSlot>
      </SectionErrorBoundary>
    </section>
  );
}
