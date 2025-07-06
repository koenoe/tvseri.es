import type { ReactNode } from 'react';

import Page from '@/components/Page/Page';
import Tabs from '@/components/Tabs/Tabs';

const menuItems = [
  {
    href: '/settings/profile',
    label: 'Profile',
  },
  {
    href: '/settings/import',
    label: 'Import',
  },
  {
    href: '/settings/streaming-services',
    label: 'Streaming services',
  },
  {
    href: '/settings/webhooks',
    label: 'Webhooks',
  },
] as const;

export default function SettingsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Page backgroundContext="dots">
      <div className="container">
        <Tabs className="mb-10" items={menuItems} layoutId="settings" />
        {children}
      </div>
    </Page>
  );
}
