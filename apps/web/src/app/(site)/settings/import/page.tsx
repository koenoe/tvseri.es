import type { Metadata } from 'next';
import SectionErrorBoundary from '../_components/SectionErrorBoundary';
import SectionHeader from '../_components/SectionHeader';
import SettingsHole from '../_components/SettingsHole';
import ImportSection from './_components/ImportSection';
import ImportSkeleton from './_components/ImportSkeleton';

/** The section's skeleton: its hole's fallback and its failure's space */
const importSkeleton = <ImportSkeleton />;

export const metadata: Metadata = { title: 'Import' };

/** Import. */
export default function Page() {
  return (
    <section
      className="flex flex-col gap-6"
      data-testid="route-settings-import"
    >
      <SectionHeader
        lede="Bring your watch history from Netflix, Prime Video or any CSV."
        title="Import"
      />
      <SectionErrorBoundary placeholder={importSkeleton} what="The importer">
        <SettingsHole fallback={importSkeleton} name="import">
          <ImportSection />
        </SettingsHole>
      </SectionErrorBoundary>
    </section>
  );
}
