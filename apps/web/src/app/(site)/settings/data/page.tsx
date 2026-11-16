import type { Metadata } from 'next';

import SectionErrorBoundary from '../_components/SectionErrorBoundary';
import SectionHeader from '../_components/SectionHeader';
import SettingsHole from '../_components/SettingsHole';
import { DeleteSkeleton, StatsSkeleton } from './_components/DataSkeletons';
import DataStats from './_components/DataStats';
import DeleteAccountHole from './_components/DeleteAccountHole';
import ExportCard from './_components/ExportCard';

/** The sections' skeletons: each hole's fallback and its failure's space */
const statsSkeleton = <StatsSkeleton />;
const deleteSkeleton = <DeleteSkeleton />;

export const metadata: Metadata = { title: 'Your data' };

/** Your data: your numbers, the exports, delete account. */
export default function Page() {
  return (
    <section className="flex flex-col gap-6" data-testid="route-settings-data">
      <SectionHeader
        lede="Everything you’ve marked, yours to take or delete."
        title="Your data"
      />
      <SectionErrorBoundary placeholder={statsSkeleton} what="Your numbers">
        <SettingsHole fallback={statsSkeleton} name="data-stats">
          <DataStats />
        </SettingsHole>
      </SectionErrorBoundary>
      <ExportCard />
      <SectionErrorBoundary placeholder={deleteSkeleton} what="Delete account">
        <SettingsHole fallback={deleteSkeleton} name="data-delete">
          <DeleteAccountHole />
        </SettingsHole>
      </SectionErrorBoundary>
    </section>
  );
}
