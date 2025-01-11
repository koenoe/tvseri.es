import { type ReactNode } from 'react';

import Page from '@/components/Page/Page';
import Tabs from '@/components/Tabs/Tabs';

const menuItems = [
  {
    label: 'Profile',
    href: '/settings/profile',
  },
  {
    label: 'Import',
    href: '/settings/import',
  },
  {
    label: 'Webhooks',
    href: '/settings/webhooks',
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
        <Tabs items={menuItems} />
        <div className="mt-10">{children}</div>
      </div>
    </Page>
  );
}
