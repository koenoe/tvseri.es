import type { Metadata } from 'next';

import Page from '@/components/background/Page';
import { HowItWorksDialog } from '@/components/extension/HowItWorks';
import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';
import StreamedSlot from '@/components/ui/StreamedSlot';
import cn from '@/lib/cn';
import { CtaSkeleton } from './_components/CtaParts';
import ExtensionCta from './_components/ExtensionCta';
import InstallSection from './_components/InstallSection';
import ServiceLogos from './_components/ServiceLogos';

export const metadata: Metadata = {
  description:
    'Sync your streaming history from Netflix, Prime Video and BBC iPlayer. Connect once, choose how far back, and it updates every night.',
  title: { absolute: 'Chrome Extension · tvseri.es' },
};

const COLUMN = cn(PAGE_COLUMN, 'flex flex-col pt-5 md:pt-16');

const ctaSkeleton = <CtaSkeleton />;

/** Static apart from the call-to-action, which streams into its own slot */
export default function ExtensionPage() {
  return (
    <Page>
      <div className={COLUMN} data-testid="route-extension">
        <header className="flex flex-col gap-3 md:gap-4">
          <span className="text-overline text-white/60 uppercase">
            Chrome extension
          </span>
          <h1 className="font-display text-display">
            Sync your streaming history
          </h1>
          <p className="max-w-140 text-body-sm text-white/80 md:text-body">
            From Netflix, Prime Video and BBC iPlayer. Connect once, choose how
            far back, and it updates every night.
          </p>
          <ServiceLogos />
          <div className="mt-3">
            <StreamedSlot fallback={ctaSkeleton} name="extension-cta">
              <ExtensionCta />
            </StreamedSlot>
          </div>
        </header>
        <InstallSection />
      </div>
      <HowItWorksDialog />
    </Page>
  );
}
