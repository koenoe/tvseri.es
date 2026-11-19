import type { Metadata } from 'next';
import Link from 'next/link';
import StreamedSlot from '@/components/ui/StreamedSlot';
import SectionErrorBoundary from '../_components/SectionErrorBoundary';
import SectionHeader from '../_components/SectionHeader';
import ImportSection from './_components/ImportSection';
import ImportSkeleton from './_components/ImportSkeleton';

/** The section's skeleton: its hole's fallback and its failure's space */
const importSkeleton = <ImportSkeleton />;

const lede = (
  <>
    Upload your watch history as a CSV from Netflix, Prime Video or anywhere
    else. To keep it in sync automatically, use{' '}
    <Link
      className="text-white/80 underline decoration-white/30 underline-offset-3 transition-colors hover:text-white"
      href="/settings/connected-apps"
    >
      Connected apps
    </Link>
    .
  </>
);

export const metadata: Metadata = { title: 'Import' };

/** Import: a one-off CSV upload, unlike Connected apps' sync. */
export default function Page() {
  return (
    <section
      className="flex flex-col gap-6"
      data-testid="route-settings-import"
    >
      <SectionHeader lede={lede} title="Import" />
      <SectionErrorBoundary placeholder={importSkeleton} what="The importer">
        <StreamedSlot fallback={importSkeleton} name="import">
          <ImportSection />
        </StreamedSlot>
      </SectionErrorBoundary>
    </section>
  );
}
