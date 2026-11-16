import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Page from '@/components/background/Page';
import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';

import IndexOnlyOnPhones from './_components/IndexOnlyOnPhones';
import SettingsHero from './_components/SettingsHero';
import SettingsNav from './_components/SettingsNav';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: { default: 'Settings', template: '%s · Settings' },
};

/**
 * The settings shell: the typographic header, the
 * sidebar (from `lg`) or the section list (below it, `/settings` only;
 * tablets take the phone's shell) and the section.
 * Everything here is static; the viewer's data streams into small holes
 * (`getSettingsSession()` inside Suspense), so the frame is instant and
 * nothing per user is ever in a shared cache.
 */
export default function SettingsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Page>
      <div className={PAGE_COLUMN}>
        <IndexOnlyOnPhones className="pt-6 pb-6 md:pt-7 md:pb-12">
          <SettingsHero />
        </IndexOnlyOnPhones>
        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-16">
          <IndexOnlyOnPhones>
            <SettingsNav />
          </IndexOnlyOnPhones>
          <div className="flex min-w-0 flex-col gap-6 pt-6 lg:pt-0">
            {children}
          </div>
        </div>
      </div>
    </Page>
  );
}
