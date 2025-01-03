import { type ReactNode } from 'react';

import Page from '@/components/Page/Page';
import Tabs, { type Tab } from '@/components/Tabs/Tabs';

export default async function SettingsLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<
    Readonly<{
      tab: string;
    }>
  >;
}>) {
  const { tab } = await params;

  return (
    <Page backgroundContext="dots">
      <div className="container">
        <Tabs activeTab={tab as Tab} />
        <div className="mt-10">{children}</div>
      </div>
    </Page>
  );
}
