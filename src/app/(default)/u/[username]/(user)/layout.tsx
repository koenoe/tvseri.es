import { type ReactNode } from 'react';

import { unstable_cacheLife as cacheLife } from 'next/cache';

import Page from '@/components/Page/Page';
import Pills from '@/components/Tabs/Pills';

const getCurrentYear = async () => {
  'use cache';
  cacheLife('max');

  return new Date().getFullYear();
};

export default async function Layout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ username: string }>;
}>) {
  const [{ username }, year] = await Promise.all([params, getCurrentYear()]);

  const menuItems = [
    // {
    //   label: 'Profile',
    //   href: `/u/${username}/profile`,
    // },
    {
      label: 'In progress',
      href: `/u/${username}/in-progress`,
    },
    {
      label: 'Finished',
      href: `/u/${username}/finished`,
    },
    {
      label: 'Watchlist',
      href: `/u/${username}/watchlist`,
    },
    {
      label: 'Favorites',
      href: `/u/${username}/favorites`,
    },
    {
      label: 'Stats',
      href: `/u/${username}/stats/${year}`,
    },
  ] as const;

  return (
    <Page backgroundContext="dots">
      <div className="container">
        <div className="relative mb-10 w-full">
          <Pills items={menuItems} layoutId="profile" className="w-full" />
        </div>
        {children}
      </div>
    </Page>
  );
}
