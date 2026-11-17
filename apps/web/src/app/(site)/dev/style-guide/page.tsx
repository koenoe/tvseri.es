import type { Metadata } from 'next';
import ButtonSection from './_sections/ButtonSection';
import ChromeSection from './_sections/ChromeSection';
import DialogSection from './_sections/DialogSection';
import EdgeSection from './_sections/EdgeSection';
import ErrorSection from './_sections/ErrorSection';
import GhostSection from './_sections/GhostSection';
import HeadingSection from './_sections/HeadingSection';
import HistorySection from './_sections/HistorySection';
import IconSection from './_sections/IconSection';
import ImdbSection from './_sections/ImdbSection';
import MetaSection from './_sections/MetaSection';
import PanelSection from './_sections/PanelSection';
import RemoteSection from './_sections/RemoteSection';
import RowSection from './_sections/RowSection';
import TileSection from './_sections/TileSection';
import ToastSection from './_sections/ToastSection';
import TypeSection from './_sections/TypeSection';
import UnavailableSection from './_sections/UnavailableSection';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Style guide',
};

/**
 * Internal: every ui primitive as the design draws it, to compare side by side
 * in Chrome. Not part of production builds (`/dev`'s layout).
 */
export default function StyleGuidePage() {
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-gutter pt-28 pb-16">
      <h1 className="font-display text-display">Style guide</h1>
      <TypeSection />
      <EdgeSection />
      <IconSection />
      <ButtonSection />
      <MetaSection />
      <HeadingSection />
      <GhostSection />
      <DialogSection />
      <PanelSection />
      <ToastSection />
      <RemoteSection />
      <TileSection />
      <RowSection />
      <HistorySection />
      <ChromeSection />
      <ImdbSection />
      <UnavailableSection />
      <ErrorSection />
    </main>
  );
}
