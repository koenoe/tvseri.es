import { Suspense } from 'react';

import SortBySelect from '@/components/Grid/SortBySelect';
import PageDivider from '@/components/Page/Divider';
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
        <div className="mb-10 mt-4 flex items-center">
          <PageDivider className="h-auto" />
          <Suspense fallback={null}>
            <SortBySelect className="ml-auto" options={sortOptions} />
          </Suspense>
        </div>
        {children}
      </div>
    </Page>
  );
}
