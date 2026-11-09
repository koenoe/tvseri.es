import type { ReactNode } from 'react';

import { ImportIcon } from '@/components/Icons/ImportIcon';
import { LinkIcon } from '@/components/Icons/LinkIcon';
import { TvIcon } from '@/components/Icons/TvIcon';
import { UserIcon } from '@/components/Icons/UserIcon';
import Page from '@/components/Page/Page';
import Tabs from '@/components/Tabs/Tabs';

const iconClassName = 'size-4 flex-shrink-0';

const menuItems = [
  {
    href: '/settings/profile',
    icon: <UserIcon className={iconClassName} />,
    label: 'Profile',
  },
  {
    href: '/settings/import',
    icon: <ImportIcon className={iconClassName} />,
    label: 'Import',
  },
  {
    href: '/settings/streaming-services',
    icon: <TvIcon className={iconClassName} />,
    label: 'Streaming services',
  },
  {
    href: '/settings/webhooks',
    icon: <LinkIcon className={iconClassName} />,
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
