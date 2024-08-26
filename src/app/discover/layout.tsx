import { Suspense } from 'react';

import SortBySelect from '@/components/Grid/SortBySelect';
import Page from '@/components/Page/Page';

const sortOptions = [
  {
    value: 'popularity.desc',
    label: 'Popularity',
  },
  {
    value: 'first_air_date.desc',
    label: 'Air date',
  },
  {
    value: 'vote_average.desc',
    label: 'Vote avg.',
  },
  {
    value: 'vote_count.desc',
    label: 'Vote count',
  },
];

export default async function DiscoverLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Page backgroundContext="dots">
      <div className="container">
        <div className="my-8 flex items-center">
          <h1 className="text-2xl font-medium lg:text-3xl">Discover</h1>
          <Suspense fallback={null}>
            <SortBySelect className="ml-auto" options={sortOptions} />
          </Suspense>
        </div>
        {children}
      </div>
    </Page>
  );
}
